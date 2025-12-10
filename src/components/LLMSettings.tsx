import { useState, useEffect, useCallback } from 'react';
import { Brain, Check, X, Plus, Trash2, Link2, ExternalLink, ChevronDown, AlertCircle, Loader } from 'lucide-react';
import {
  LLM_PROVIDERS,
  LLMProvider,
  LLMConfig,
  getLLMConfigFromEnv,
  getModelsByProvider,
  getModelInfo,
  isValidModel,
} from '../config/llmConfig';
import { llmService } from '../services/llmService';

interface LLMIntegrationState {
  provider: LLMProvider;
  config: LLMConfig | null;
  isConnected: boolean;
  isTesting: boolean;
  testResult: { success: boolean; message: string } | null;
  error: string | null;
}

/**
 * LLMSettings Component - Production-ready LLM provider management
 * Supports OpenAI, Groq, Azure OpenAI, Claude, and TestLeaf
 */
export function LLMSettings() {
  const [integrations, setIntegrations] = useState<LLMIntegrationState[]>([]);
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [tempConfig, setTempConfig] = useState<Partial<LLMConfig>>({});
  const [expandedModel, setExpandedModel] = useState<LLMProvider | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize from environment on mount
  useEffect(() => {
    const envConfigs = getLLMConfigFromEnv();
    const providers: LLMIntegrationState[] = Object.keys(LLM_PROVIDERS).map((key) => {
      const provider = key as LLMProvider;
      const config = envConfigs[provider] || null;
      return {
        provider,
        config,
        isConnected: !!config?.apiKey,
        isTesting: false,
        testResult: null,
        error: null,
      };
    });
    setIntegrations(providers);
    llmService.clearCache();
  }, []);

  /**
   * Validate form inputs
   */
  const validateForm = useCallback((provider: LLMProvider): boolean => {
    const errors: Record<string, string> = {};

    if (!tempConfig.apiKey || !tempConfig.apiKey.trim()) {
      errors.apiKey = 'API Key is required';
    }

    if (!tempConfig.endpoint || !tempConfig.endpoint.trim()) {
      errors.endpoint = 'Endpoint is required';
    } else {
      try {
        new URL(tempConfig.endpoint);
      } catch {
        errors.endpoint = 'Invalid URL format';
      }
    }

    if (!tempConfig.model || !tempConfig.model.trim()) {
      errors.model = 'Model selection is required';
    } else if (!isValidModel(provider, tempConfig.model)) {
      errors.model = 'Invalid model for this provider';
    }

    const providerConfig = LLM_PROVIDERS[provider];
    if (providerConfig.additionalFields) {
      for (const field of providerConfig.additionalFields) {
        const value = (tempConfig as Record<string, string | undefined>)[field.name];
        if (field.required && (!value || !value.trim())) {
          errors[field.name] = `${field.label} is required`;
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [tempConfig]);

  /**
   * Handle edit mode for a provider
   */
  const handleEdit = useCallback((provider: LLMProvider) => {
    const integration = integrations.find((i) => i.provider === provider);
    if (integration?.config) {
      setTempConfig({ ...integration.config });
    } else {
      const providerConfig = LLM_PROVIDERS[provider];
      setTempConfig({
        provider,
        apiKey: '',
        endpoint: providerConfig.endpoint,
        model: providerConfig.defaultModel,
      });
    }
    setEditingProvider(provider);
    setFormErrors({});
  }, [integrations]);

  /**
   * Save configuration
   */
  const handleSave = useCallback(
    async (provider: LLMProvider) => {
      if (!validateForm(provider)) {
        return;
      }

      setIsSaving(true);
      try {
        const newConfig: LLMConfig = {
          provider: tempConfig.provider || provider,
          apiKey: tempConfig.apiKey!,
          endpoint: tempConfig.endpoint!,
          model: tempConfig.model!,
          deploymentName: tempConfig.deploymentName,
          apiVersion: tempConfig.apiVersion,
        };

        llmService.addConfig(provider, newConfig);

        setIntegrations((prev) =>
          prev.map((i) =>
            i.provider === provider
              ? { ...i, config: newConfig, isConnected: true, testResult: null, error: null }
              : i
          )
        );

        setEditingProvider(null);
        setFormErrors({});
      } catch (error) {
        setFormErrors({
          submit: error instanceof Error ? error.message : 'Failed to save configuration',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [tempConfig, validateForm]
  );

  /**
   * Test connection to provider
   */
  const handleTestConnection = useCallback(async (provider: LLMProvider) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.provider === provider ? { ...i, isTesting: true, testResult: null } : i
      )
    );

    const result = await llmService.testConnection(provider);

    setIntegrations((prev) =>
      prev.map((i) =>
        i.provider === provider ? { ...i, isTesting: false, testResult: result } : i
      )
    );
  }, []);

  /**
   * Disconnect provider
   */
  const handleDisconnect = useCallback((provider: LLMProvider) => {
    llmService.removeConfig(provider);
    setIntegrations((prev) =>
      prev.map((i) =>
        i.provider === provider
          ? { ...i, config: null, isConnected: false, testResult: null, error: null }
          : i
      )
    );
    setEditingProvider(null);
    setFormErrors({});
  }, []);

  /**
   * Handle model selection change
   */
  const handleModelChange = useCallback((modelId: string) => {
    setTempConfig((prev) => ({ ...prev, model: modelId }));
    setFormErrors((prev) => {
      const updated = { ...prev };
      delete updated.model;
      return updated;
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">
          <Brain className="w-6 h-6 inline-block mr-2 text-blue-600" />
          LLM Model Integration
        </h3>
        <p className="text-slate-600">Configure and manage language model providers for AI-powered features</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {integrations.map((integration) => {
          const providerConfig = LLM_PROVIDERS[integration.provider];
          const isEditing = editingProvider === integration.provider;
          const models = getModelsByProvider(integration.provider);
          const currentModel = integration.config
            ? getModelInfo(integration.provider, integration.config.model)
            : null;

          return (
            <div
              key={integration.provider}
              className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{providerConfig.icon}</div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">{providerConfig.name}</h4>
                    <p className="text-sm text-slate-600 mt-1">{providerConfig.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {integration.isConnected && (
                    <div className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                      <Check className="w-3 h-3" />
                      Connected
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Mode */}
              {isEditing ? (
                <div className="space-y-4 border-t border-slate-200 pt-4">
                  {/* API Key Input */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {providerConfig.apiKeyLabel}
                    </label>
                    <input
                      type="password"
                      value={tempConfig.apiKey || ''}
                      onChange={(e) => {
                        setTempConfig({ ...tempConfig, apiKey: e.target.value });
                        setFormErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.apiKey;
                          return updated;
                        });
                      }}
                      placeholder="Enter your API key"
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                        formErrors.apiKey
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-blue-500'
                      }`}
                    />
                    {formErrors.apiKey && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {formErrors.apiKey}
                      </p>
                    )}
                  </div>

                  {/* Endpoint Input */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      API Endpoint
                    </label>
                    <input
                      type="text"
                      value={tempConfig.endpoint || ''}
                      onChange={(e) => {
                        setTempConfig({ ...tempConfig, endpoint: e.target.value });
                        setFormErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.endpoint;
                          return updated;
                        });
                      }}
                      placeholder="https://api.example.com"
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                        formErrors.endpoint
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-blue-500'
                      }`}
                    />
                    {formErrors.endpoint && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {formErrors.endpoint}
                      </p>
                    )}
                  </div>

                  {/* Model Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Select Model
                    </label>
                    <select
                      value={tempConfig.model || ''}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all bg-white ${
                        formErrors.model
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Choose a model...</option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                          {model.contextWindow ? ` (${model.contextWindow.toLocaleString()} tokens)` : ''}
                        </option>
                      ))}
                    </select>
                    {formErrors.model && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {formErrors.model}
                      </p>
                    )}

                    {/* Model Info Preview */}
                    {tempConfig.model && isValidModel(integration.provider, tempConfig.model) && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-slate-700">
                        <p className="font-semibold">
                          {getModelInfo(integration.provider, tempConfig.model)?.name}
                        </p>
                        <p className="text-slate-600 mt-1">
                          {getModelInfo(integration.provider, tempConfig.model)?.description}
                        </p>
                        {getModelInfo(integration.provider, tempConfig.model)?.contextWindow && (
                          <p className="text-xs text-slate-500 mt-2">
                            📊 Context:{' '}
                            {getModelInfo(integration.provider, tempConfig.model)?.contextWindow?.toLocaleString()}{' '}
                            tokens
                          </p>
                        )}
                        {getModelInfo(integration.provider, tempConfig.model)?.costPer1kTokens && (
                          <p className="text-xs text-slate-500 mt-1">
                            💰 Cost: $
                            {getModelInfo(integration.provider, tempConfig.model)?.costPer1kTokens?.input}/1k input, $
                            {getModelInfo(integration.provider, tempConfig.model)?.costPer1kTokens?.output}/1k output
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Additional Fields */}
                  {providerConfig.additionalFields?.map((field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={(tempConfig as Record<string, string | undefined>)[field.name] || ''}
                        onChange={(e) => {
                          setTempConfig({
                            ...tempConfig,
                            [field.name]: e.target.value,
                          });
                          setFormErrors((prev) => {
                            const updated = { ...prev };
                            delete updated[field.name];
                            return updated;
                          });
                        }}
                        placeholder={field.placeholder}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                          formErrors[field.name]
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-slate-300 focus:ring-blue-500'
                        }`}
                      />
                      {formErrors[field.name] && (
                        <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {formErrors[field.name]}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Submit Error */}
                  {formErrors.submit && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{formErrors.submit}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSave(integration.provider)}
                      disabled={isSaving}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      {isSaving && <Loader className="w-4 h-4 animate-spin" />}
                      Save Configuration
                    </button>
                    <button
                      onClick={() => {
                        setEditingProvider(null);
                        setFormErrors({});
                      }}
                      className="flex-1 bg-slate-300 text-slate-700 py-2 rounded-lg hover:bg-slate-400 transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  {integration.config && (
                    <>
                      {/* Configuration Display */}
                      <div className="text-sm text-slate-600 space-y-2">
                        <div>
                          <span className="font-semibold">Model:</span>{' '}
                          {currentModel?.name || integration.config.model}
                        </div>
                        {currentModel?.contextWindow && (
                          <div>
                            <span className="font-semibold">Context:</span>{' '}
                            {currentModel.contextWindow.toLocaleString()} tokens
                          </div>
                        )}
                        <div>
                          <span className="font-semibold">Endpoint:</span> {integration.config.endpoint}
                        </div>
                      </div>

                      {/* Model Selector Dropdown */}
                      <div className="mt-3">
                        <button
                          onClick={() =>
                            setExpandedModel(expandedModel === integration.provider ? null : integration.provider)
                          }
                          className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <span className="text-sm font-semibold text-slate-700">View available models</span>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              expandedModel === integration.provider ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {/* Models List */}
                        {expandedModel === integration.provider && (
                          <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                            {models.map((model) => (
                              <div
                                key={model.id}
                                className={`p-3 border-b border-slate-100 last:border-b-0 ${
                                  integration.config?.model === model.id ? 'bg-blue-50' : 'bg-white'
                                } hover:bg-slate-50 transition-colors cursor-pointer`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-semibold text-slate-900 text-sm">
                                      {model.name}
                                      {integration.config?.model === model.id && (
                                        <Check className="w-3 h-3 inline-block ml-2 text-green-600" />
                                      )}
                                    </p>
                                    <p className="text-xs text-slate-600 mt-1">{model.description}</p>
                                    <div className="flex gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                                      {model.contextWindow && (
                                        <span>📊 {model.contextWindow.toLocaleString()} tokens</span>
                                      )}
                                      {model.costPer1kTokens && (
                                        <span>
                                          💰 ${model.costPer1kTokens.input}/${model.costPer1kTokens.output} per 1k
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Test Result */}
                      {integration.testResult && (
                        <div
                          className={`flex items-center gap-2 p-3 rounded-lg text-sm font-semibold ${
                            integration.testResult.success
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {integration.testResult.success ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          {integration.testResult.message}
                        </div>
                      )}
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleEdit(integration.provider)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      {integration.isConnected ? 'Edit' : 'Configure'}
                    </button>

                    {integration.isConnected && (
                      <>
                        <button
                          onClick={() => handleTestConnection(integration.provider)}
                          disabled={integration.isTesting}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-semibold text-sm"
                        >
                          {integration.isTesting ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <Link2 className="w-4 h-4" />
                              Test
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDisconnect(integration.provider)}
                          className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <a
                      href={providerConfig.docLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-semibold text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Configuration Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📝 Configuration Guide</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Store API keys in your `.env.local` file using the `VITE_*` prefix</li>
          <li>• Never commit `.env.local` to version control - add it to `.gitignore`</li>
          <li>• Each provider supports multiple models with different capabilities</li>
          <li>• Test connections to verify API credentials before using in production</li>
          <li>• Model pricing and context window information is displayed for reference</li>
          <li>• Your QA Suite will automatically load configured providers on startup</li>
        </ul>
      </div>

      {/* Summary Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="font-semibold text-slate-900 mb-2">Active Integrations</h4>
        <div className="text-sm text-slate-700">
          {integrations.filter((i) => i.isConnected).length === 0 ? (
            <p className="text-slate-500">No integrations configured yet. Configure one to get started.</p>
          ) : (
            <ul className="space-y-1">
              {integrations
                .filter((i) => i.isConnected)
                .map((i) => (
                  <li key={i.provider}>
                    ✅ {LLM_PROVIDERS[i.provider].name} - Model: {i.config?.model}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
