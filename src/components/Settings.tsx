import { useState } from 'react';
import { Brain, Zap, Figma, Settings2 } from 'lucide-react';

interface Integration {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isConnected: boolean;
  apiKey?: string;
}

export function Settings() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'llm',
      title: 'LLM Model Integration',
      description: 'Connect to language models like OpenAI, Claude, or Gemini',
      icon: <Brain className="w-8 h-8" />,
      isConnected: false,
      apiKey: '',
    },
    {
      id: 'embedding',
      title: 'Embedding Integration',
      description: 'Configure vector embeddings for semantic search',
      icon: <Zap className="w-8 h-8" />,
      isConnected: false,
      apiKey: '',
    },
    {
      id: 'jira',
      title: 'Jira Integration',
      description: 'Sync with Jira for issue tracking and project management',
      icon: <Figma className="w-8 h-8" />,
      isConnected: false,
      apiKey: '',
    },
    {
      id: 'servicenow',
      title: 'ServiceNow Integration',
      description: 'Connect to ServiceNow for incident and change management',
      icon: <Settings2 className="w-8 h-8" />,
      isConnected: false,
      apiKey: '',
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempApiKey, setTempApiKey] = useState('');

  const handleConnect = (id: string) => {
    setEditingId(id);
    const integration = integrations.find((i) => i.id === id);
    setTempApiKey(integration?.apiKey || '');
  };

  const handleSave = (id: string) => {
    setIntegrations(
      integrations.map((i) =>
        i.id === id ? { ...i, apiKey: tempApiKey, isConnected: !!tempApiKey } : i
      )
    );
    setEditingId(null);
  };

  const handleDisconnect = (id: string) => {
    setIntegrations(
      integrations.map((i) =>
        i.id === id ? { ...i, apiKey: '', isConnected: false } : i
      )
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Integrations</h3>
        <p className="text-slate-600">Configure and manage your external service integrations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="text-blue-600 bg-blue-50 p-3 rounded-lg">
                  {integration.icon}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{integration.title}</h4>
                  <p className="text-sm text-slate-600 mt-1">{integration.description}</p>
                </div>
              </div>
            </div>

            {editingId === integration.id ? (
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    API Key / Connection String
                  </label>
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Enter your API key or connection credentials"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSave(integration.id)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex-1 bg-slate-300 text-slate-700 py-2 rounded-lg hover:bg-slate-400 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 border-t border-slate-200 pt-4">
                {integration.isConnected ? (
                  <>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-sm font-semibold text-green-700">Connected</span>
                    </div>
                    <button
                      onClick={() => handleConnect(integration.id)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors font-semibold"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                      <span className="text-sm font-semibold text-slate-600">Not connected</span>
                    </div>
                    <button
                      onClick={() => handleConnect(integration.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      Connect
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
        <h4 className="font-semibold text-slate-900 mb-2">Need help?</h4>
        <p className="text-sm text-slate-600">
          Contact support or refer to the documentation for detailed setup instructions for each integration.
        </p>
      </div>
    </div>
  );
}
