import { useState, useEffect } from 'react';
import { Sparkles, ChevronDown, Loader, AlertCircle, Check } from 'lucide-react';
import type { Story } from '../services/integrationService';
import { fetchAllStories } from '../services/integrationService';

export function RequirementAnalysis() {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadStories = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedStories = await fetchAllStories();
        setStories(fetchedStories);
        if (fetchedStories.length > 0) {
          setSelectedStory(fetchedStories[0]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load stories';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadStories();
  }, []);

  const filteredStories = stories.filter(
    (story) =>
      story.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserStoryAnalysis = async () => {
    if (!selectedStory) {
      setError('Please select a story to analyze');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      setSuccess(null);
      setAnalysisResult(null);

      // Get configured providers from LLMService
      const { llmService } = await import('../services/llmService');
      const configuredProviders = llmService.getConfiguredProviders();

      if (configuredProviders.length === 0) {
        setError('No LLM providers configured. Please configure at least one provider in Settings.');
        return;
      }

      const provider = configuredProviders[0];
      const config = llmService.getConfig(provider);

      if (!config) {
        setError(`Provider ${provider} is not properly configured`);
        return;
      }

      const acceptanceCriteriaText = selectedStory.acceptanceCriteria
        ? parseAcceptanceCriteria(selectedStory.acceptanceCriteria)
            .map((criterion) => `• ${criterion}`)
            .join('\n')
        : 'No acceptance criteria provided';

      const prompt = `You are an expert QA analyst specializing in user story quality assessment. Review the following user story and provide a comprehensive analysis using the INVEST methodology.

USER STORY DETAILS:
================
Story ID: ${selectedStory.key}
Title: ${selectedStory.title}
Description: ${selectedStory.description}

Acceptance Criteria:
${acceptanceCriteriaText}

Status: ${selectedStory.status}
Priority: ${selectedStory.priority}
${selectedStory.epicKey ? `Epic Number: ${selectedStory.epicKey}` : ''}
${selectedStory.epicTitle ? `Epic Title: ${selectedStory.epicTitle}` : ''}

ANALYSIS REQUIREMENTS:
====================
Analyze this user story against the INVEST methodology framework with the following criteria:

1. INDEPENDENT
   - Is the story independent from other stories?
   - Can it be developed without dependencies?

2. NEGOTIABLE
   - Are the details open to discussion?
   - Is there flexibility in implementation approach?

3. VALUABLE
   - Does it deliver clear value to the user/business?
   - Is the value proposition clear?

4. ESTIMABLE
   - Can the work be estimated?
   - Are requirements clear enough for estimation?

5. SMALL
   - Can it be completed within one sprint?
   - Is the scope appropriately sized?

6. TESTABLE
   - Are acceptance criteria clearly testable?
   - Can success be objectively verified?

Please provide:
1. A brief score (0-10) for each INVEST criterion
2. Current gaps or issues in the user story
3. Specific recommendations for improvement
4. Any missing acceptance criteria that should be added
5. Overall assessment and priority for refinement

Format your response in a clear, structured manner with sections for each criterion.`;

      // Make API call to LLM
      let url = '';
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (provider === 'azure-openai') {
        const endpoint = config.endpoint.endsWith('/') ? config.endpoint : `${config.endpoint}/`;
        const deploymentName = (config as any).deploymentName || config.model;
        const apiVersion = (config as any).apiVersion || '2024-02-15-preview';
        url = `${endpoint}openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;
        headers['api-key'] = config.apiKey;
      } else if (provider === 'openai') {
        url = 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      } else if (provider === 'groq') {
        const baseEndpoint = config.endpoint.endsWith('/chat/completions')
          ? config.endpoint
          : `${config.endpoint}/chat/completions`;
        url = baseEndpoint;
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      } else if (provider === 'claude') {
        url = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = config.apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else if (provider === 'testleaf') {
        const endpoint = config.endpoint.endsWith('/') ? config.endpoint : `${config.endpoint}/`;
        url = `${endpoint}chat/completions`;
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }

      // Prepare request body based on provider
      let body: any;

      if (provider === 'claude') {
        body = JSON.stringify({
          model: config.model,
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });
      } else {
        body = JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert QA analyst specializing in user story quality assessment using INVEST methodology.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`LLM API error: ${response.statusText} - ${errorData}`);
      }

      const data = await response.json();
      let analysis = '';

      // Extract response based on provider
      if (provider === 'claude') {
        analysis = data.content[0].text;
      } else {
        analysis = data.choices[0].message.content;
      }

      setAnalysisResult(analysis);
      setSuccess('User story analysis completed successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      console.error('Error analyzing user story:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseAcceptanceCriteria = (html: string): string[] => {
    if (!html) return [];
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const listItems = tempDiv.querySelectorAll('li');
    const items: string[] = [];
    
    listItems.forEach((li) => {
      const text = li.textContent?.trim() || '';
      if (text) {
        items.push(text);
      }
    });
    
    if (items.length === 0) {
      const cleanText = html
        .replace(/<[^>]*>/g, '')
        .replace(/&#\d+;/g, (match) => {
          const code = parseInt(match.substring(2, match.length - 1));
          return String.fromCharCode(code);
        })
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      
      return [cleanText].filter((text) => text.length > 0);
    }
    
    return items;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Requirement Analysis</h2>
          <p className="text-slate-600 mt-1">Analyze user stories from Jira & ServiceNow using AI</p>
        </div>
      </div>

      {/* Main Grid Layout: Stories and Selected Story */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stories Section */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 space-y-4">
          <h3 className="font-semibold text-slate-900 text-lg">Stories</h3>
          
          {/* Search Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Search Stories</label>
            <input
              type="text"
              placeholder="Search by Story ID or text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Stories List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          ) : filteredStories.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-slate-600">No stories found</p>
              <p className="text-xs text-slate-500 mt-2">Configure Jira or ServiceNow credentials</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStories.map((story) => (
                <button
                  key={`${story.source}-${story.id}`}
                  onClick={() => setSelectedStory(story)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedStory?.id === story.id && selectedStory?.source === story.source
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900 truncate">{story.key}</div>
                  <div className="text-xs text-slate-600 mt-1 line-clamp-2">{story.title}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Story Details Section */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
          {selectedStory ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Selected Story</h3>
              </div>

              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              {success && (
                <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>{success}</div>
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-semibold text-slate-700">Key:</span>
                  <p className="text-slate-600 mt-1">{selectedStory.key}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Title:</span>
                  <p className="text-slate-600 mt-1">{selectedStory.title}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="font-semibold text-slate-700">Status:</span>
                    <span className="ml-2 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                      {selectedStory.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Priority:</span>
                    <span className="ml-2 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                      {selectedStory.priority}
                    </span>
                  </div>
                </div>
                {selectedStory.assignee && (
                  <div>
                    <span className="font-semibold text-slate-700">Assignee:</span>
                    <p className="text-slate-600 mt-1">{selectedStory.assignee}</p>
                  </div>
                )}
                <div>
                  <span className="font-semibold text-slate-700">Description:</span>
                  <p className="text-slate-600 mt-1 bg-slate-50 p-2 rounded max-h-24 overflow-y-auto">
                    {selectedStory.description}
                  </p>
                </div>
                {selectedStory.acceptanceCriteria && (
                  <div>
                    <span className="font-semibold text-slate-700">Acceptance Criteria:</span>
                    <ul className="text-slate-600 mt-2 bg-slate-50 p-3 rounded max-h-32 overflow-y-auto space-y-2 list-disc list-inside text-sm">
                      {parseAcceptanceCriteria(selectedStory.acceptanceCriteria).map((criterion, idx) => (
                        <li key={idx} className="text-slate-700">
                          {criterion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedStory && (selectedStory.epicKey || selectedStory.epicTitle) && (
                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-900">Epic Information</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-semibold text-slate-700">Epic Number:</span>
                        <p className="text-slate-600 mt-1">{selectedStory.epicKey || '-'}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Epic Short Description:</span>
                        <p className="text-slate-600 mt-1 truncate" title={selectedStory.epicTitle}>
                          {selectedStory.epicTitle || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleUserStoryAnalysis}
                disabled={isAnalyzing || !selectedStory}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold flex items-center justify-center gap-2 mt-6"
              >
                {isAnalyzing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    User Story Analysis
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-slate-600 text-center py-8">Select a story to view details and perform analysis</p>
          )}
        </div>
      </div>

      {/* Analysis Results Section */}
      {analysisResult && (
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Analysis Results</h3>
          <div className="bg-slate-50 p-4 rounded-lg whitespace-pre-wrap text-slate-700 max-h-96 overflow-y-auto text-sm border border-slate-200">
            {analysisResult}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 How it works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Stories are automatically fetched from configured Jira and ServiceNow instances</li>
          <li>• Search and select a story to view its complete details</li>
          <li>• Click "User Story Analysis" to analyze the requirement using AI</li>
          <li>• Review the comprehensive analysis results including acceptance criteria validation</li>
        </ul>
      </div>
    </div>
  );
}
