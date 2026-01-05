import { useState, useEffect } from 'react';
import { Eye, Plus, Play, Clock, CheckCircle, XCircle, Loader, AlertCircle, Upload, Zap } from 'lucide-react';
import { visualTestingService, type Project, type Baseline, type TestRun } from '../services/visualTestingService';

export function VisualTesting() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [allBaselines, setAllBaselines] = useState<Baseline[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [pixelResults, setPixelResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Form states
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateBaseline, setShowCreateBaseline] = useState(false);
  const [showRunTest, setShowRunTest] = useState(false);
  const [showPixelCompare, setShowPixelCompare] = useState(false);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [selectedAiExplanation, setSelectedAiExplanation] = useState<any>(null);

  useEffect(() => {
    checkConnection();
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadBaselines(selectedProject.id);
    }
  }, [selectedProject]);

  const checkConnection = async () => {
    const connected = await visualTestingService.checkHealth();
    setIsConnected(connected);
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await visualTestingService.getProjects();
      setProjects(projectsData);
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0]);
      }
      
      // Load all baselines for dropdowns
      const allBaselinesData = [];
      for (const project of projectsData) {
        const projectBaselines = await visualTestingService.getBaselines(project.id);
        allBaselinesData.push(...projectBaselines);
      }
      setAllBaselines(allBaselinesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadBaselines = async (projectId: string) => {
    try {
      const baselinesData = await visualTestingService.getBaselines(projectId);
      setBaselines(baselinesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load baselines');
    }
  };

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const project = await visualTestingService.createProject({
        name: formData.get('name') as string,
        baseUrl: formData.get('baseUrl') as string,
        diffThreshold: Number(formData.get('diffThreshold')) || 95,
        aiEnabled: formData.get('aiEnabled') === 'on',
      });
      
      setProjects([...projects, project]);
      setSelectedProject(project);
      setShowCreateProject(false);
      setSuccess('Project created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  const handleCreateBaseline = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const projectId = formData.get('projectId') as string;
    
    try {
      const baseline = await visualTestingService.createBaseline({
        projectId,
        name: formData.get('name') as string,
        image: formData.get('image') as File,
        viewport: {
          width: Number(formData.get('width')) || 1500,
          height: Number(formData.get('height')) || 1280,
        },
        url: formData.get('url') as string,
        tags: formData.get('tags') ? (formData.get('tags') as string).split(',').map(t => t.trim()) : [],
      });
      
      setBaselines([...baselines, baseline]);
      setAllBaselines([...allBaselines, baseline]);
      setShowCreateBaseline(false);
      setSuccess('Baseline created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create baseline');
    }
  };

  const handleRunTest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const projectId = formData.get('projectId') as string;
    
    try {
      const testResult = await visualTestingService.runTest({
        projectId,
        url: formData.get('url') as string,
        baselineId: formData.get('baselineId') as string || undefined,
        viewport: {
          width: Number(formData.get('width')) || 1500,
          height: Number(formData.get('height')) || 1280,
        },
        priority: (formData.get('priority') as 'HIGH' | 'NORMAL' | 'LOW') || 'NORMAL',
      });
      
      setShowRunTest(false);
      setSuccess(`Test queued successfully (ID: ${testResult.testId})`);
      setTimeout(() => setSuccess(null), 5000);
      
      // Poll for test status
      pollTestStatus(testResult.testId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run test');
    }
  };

  const handlePixelCompare = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const projectId = formData.get('projectId') as string;
    const baselineId = formData.get('baselineId') as string;
    
    try {
      const result = await visualTestingService.pixelCompare({
        projectId,
        baselineId,
        url: formData.get('url') as string,
        viewport: {
          width: Number(formData.get('width')) || 1500,
          height: Number(formData.get('height')) || 1280,
        },
        threshold: Number(formData.get('threshold')) || 0.1,
      });
      
      setShowPixelCompare(false);
      setSuccess(`Pixel comparison completed: ${result.isDifferent ? 'Different' : 'Same'} (${result.similarityScore.toFixed(1)}% similar)`);
      setTimeout(() => setSuccess(null), 5000);
      
      // Add to pixel results
      setPixelResults(prev => [result, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare pixels');
    }
  };
  const pollTestStatus = async (testId: string) => {
    const maxAttempts = 30;
    let attempts = 0;
    
    const poll = async () => {
      try {
        const testRun = await visualTestingService.getTestStatus(testId);
        
        setTestRuns(prev => {
          const existing = prev.find(t => t.id === testId);
          if (existing) {
            return prev.map(t => t.id === testId ? testRun : t);
          }
          return [...prev, testRun];
        });
        
        if (testRun.status === 'COMPLETED' || testRun.status === 'FAILED' || attempts >= maxAttempts) {
          return;
        }
        
        attempts++;
        setTimeout(poll, 2000);
      } catch (err) {
        console.error('Failed to poll test status:', err);
      }
    };
    
    poll();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'QUEUED': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'RUNNING': return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-6">
      <div className="flex items-center gap-4 bg-white rounded-xl shadow-lg p-6 border border-slate-200">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
          <Eye className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Visual Testing</h2>
          <p className="text-slate-600 mt-1">AI-powered visual regression testing platform</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'} shadow-lg`}></div>
          <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
            {isConnected ? '🟢 Backend Connected' : '🔴 Backend Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {success && (
        <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{success}</div>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Projects */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Projects</h3>
            </div>
            <button
              onClick={() => setShowCreateProject(true)}
              className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedProject?.id === project.id
                    ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 shadow-md'
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="font-semibold text-slate-900">{project.name}</div>
                <div className="text-xs text-slate-600 mt-1 truncate">{project.baseUrl}</div>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{project.config.diffThreshold}%</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${project.config.aiEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {project.config.aiEnabled ? '🤖 AI' : '📊 Basic'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Baselines */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Upload className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Baselines</h3>
            </div>
            <button
              onClick={() => setShowCreateBaseline(true)}
              className="p-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {baselines.map((baseline) => (
              <div key={baseline.id} className="p-4 border border-slate-200 rounded-xl hover:border-green-300 hover:shadow-md transition-all duration-200">
                <div className="font-semibold text-slate-900">{baseline.name}</div>
                <div className="text-xs text-slate-600 mt-1">
                  📐 {baseline.metadata.viewport.width}x{baseline.metadata.viewport.height}
                </div>
                <div className="text-xs text-slate-500 truncate">{baseline.metadata.url}</div>
                {baseline.tags && baseline.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {baseline.tags.map((tag, index) => (
                      <span key={index} className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-2 py-1 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Run AI Visual Test */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Play className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">AI Visual Test</h3>
            </div>
            <button
              onClick={() => setShowRunTest(true)}
              className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Play className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {testRuns.map((testRun) => (
              <div key={testRun.id} className="p-4 border border-slate-200 rounded-xl hover:border-purple-300 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(testRun.status)}
                  <span className={`font-semibold text-sm px-2 py-1 rounded-full ${
                    testRun.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    testRun.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                    testRun.status === 'RUNNING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {testRun.status}
                  </span>
                </div>
                <div className="text-xs text-slate-600 truncate">{testRun.config.url}</div>
                {testRun.diffResult && (
                  <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      testRun.diffResult.isDifferent ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {testRun.diffResult.isDifferent ? '❌ Different' : '✅ Same'}
                    </span>
                    <div className="mt-1 text-xs text-slate-600">
                      📊 Pixel: {testRun.diffResult.pixelAnalysis.similarityScore.toFixed(2)}% similar
                    </div>
                    {testRun.diffResult.aiAnalysis && (
                      <div className="text-xs text-slate-600">
                        🤖 AI: {testRun.diffResult.aiAnalysis.similarityScore.toFixed(2)}% similar
                      </div>
                    )}
                    <div className="text-xs text-slate-500">
                      🎯 Confidence: {testRun.diffResult.confidence.toFixed(1)}%
                    </div>
                    {testRun.diffResult.aiExplanation && (
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            setSelectedAiExplanation(testRun.diffResult.aiExplanation);
                            setShowAiAnalysis(true);
                          }}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                        >
                          🤖 View AI Analysis
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Run Pixel Compare Test */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Zap className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Pixel Compare</h3>
            </div>
            <button
              onClick={() => setShowPixelCompare(true)}
              className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {pixelResults.map((result) => (
              <div key={result.id} className="p-4 border border-slate-200 rounded-xl hover:border-orange-300 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-900">{result.baseline?.name || 'Pixel Test'}</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    result.isDifferent ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {result.isDifferent ? '❌ Different' : '✅ Same'}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  📊 {result.similarityScore.toFixed(2)}% similar
                </div>
                <div className="text-xs text-slate-500">
                  🔍 {result.diffPixels} pixels differ ({result.mismatchPercentage.toFixed(2)}%)
                </div>
              </div>
            ))}
            {pixelResults.length === 0 && (
              <div className="text-xs text-slate-500 p-4 bg-gradient-to-r from-slate-50 to-orange-50 rounded-xl border-2 border-dashed border-slate-200">
                🎯 Pixel comparison results will appear here
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input name="name" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
                <input name="baseUrl" type="url" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Diff Threshold (%)</label>
                <input name="diffThreshold" type="number" defaultValue="95" min="0" max="100" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="flex items-center">
                <input name="aiEnabled" type="checkbox" defaultChecked className="mr-2" />
                <label className="text-sm text-slate-700">Enable AI Analysis</label>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Create
                </button>
                <button type="button" onClick={() => setShowCreateProject(false)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg hover:bg-slate-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Baseline Modal */}
      {showCreateBaseline && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Baseline</h3>
            <form onSubmit={handleCreateBaseline} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                <select name="projectId" required className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="">Select project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id} selected={selectedProject?.id === project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input name="name" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL</label>
                <input name="url" type="url" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Width</label>
                  <input name="width" type="number" defaultValue="1500" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Height</label>
                  <input name="height" type="number" defaultValue="1280" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image (optional)</label>
                <input name="image" type="file" accept="image/*" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma-separated)</label>
                <input name="tags" placeholder="homepage, desktop" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Create
                </button>
                <button type="button" onClick={() => setShowCreateBaseline(false)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg hover:bg-slate-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Run Test Modal */}
      {showRunTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Run Visual Test</h3>
            <form onSubmit={handleRunTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                <select name="projectId" required className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="">Select project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id} selected={selectedProject?.id === project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Baseline (optional)</label>
                <select name="baselineId" className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="">Select baseline...</option>
                  {allBaselines.map((baseline) => (
                    <option key={baseline.id} value={baseline.id}>
                      {baseline.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL</label>
                <input name="url" type="url" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Width</label>
                  <input name="width" type="number" defaultValue="1500" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Height</label>
                  <input name="height" type="number" defaultValue="1280" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select name="priority" className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Run Test
                </button>
                <button type="button" onClick={() => setShowRunTest(false)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg hover:bg-slate-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pixel Compare Modal */}
      {showPixelCompare && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Pixel Comparison</h3>
            <form onSubmit={handlePixelCompare} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                <select name="projectId" required className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="">Select project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id} selected={selectedProject?.id === project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Baseline</label>
                <select name="baselineId" required className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="">Select baseline...</option>
                  {allBaselines.map((baseline) => (
                    <option key={baseline.id} value={baseline.id}>
                      {baseline.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL to Compare</label>
                <input name="url" type="url" required className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Width</label>
                  <input name="width" type="number" defaultValue="1500" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Height</label>
                  <input name="height" type="number" defaultValue="1280" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Threshold (0-1)</label>
                <input name="threshold" type="number" step="0.01" defaultValue="5" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700">
                  Compare
                </button>
                <button type="button" onClick={() => setShowPixelCompare(false)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg hover:bg-slate-300">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Analysis Modal */}
      {showAiAnalysis && selectedAiExplanation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                🤖 AI Visual Analysis
              </h3>
              <button
                onClick={() => setShowAiAnalysis(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Summary</h4>
                <p className="text-blue-700">{selectedAiExplanation.summary}</p>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-2">Details</h4>
                <p className="text-slate-700">{selectedAiExplanation.details}</p>
              </div>
              
              {selectedAiExplanation.recommendations && selectedAiExplanation.recommendations.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">Recommendations</h4>
                  <ul className="list-disc list-inside space-y-1 text-green-700">
                    {selectedAiExplanation.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-2">Severity</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedAiExplanation.severity === 'high' ? 'bg-red-100 text-red-800' :
                  selectedAiExplanation.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {selectedAiExplanation.severity.toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAiAnalysis(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
        <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
          💡 <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">How it works</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Create projects to organize your visual tests
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Upload baselines or capture them from URLs
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Run tests to compare current state with baselines
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Use Pixel Compare for fast pixel-only comparisons
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              AI analyzes differences and provides explanations
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Backend runs on port 3000 - ensure it's started
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}