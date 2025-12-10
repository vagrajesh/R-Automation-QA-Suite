import { useState } from 'react';
import {
  FileText,
  TestTubes,
  Database,
  Zap,
  TrendingUp,
  MessageSquare,
  BarChart3,
  CheckSquare,
  Eye,
  Wand2,
  Code2,
  Menu,
  X,
  Settings as SettingsIcon,
  List,
} from 'lucide-react';
import { RequirementAnalysis } from './components/RequirementAnalysis';
import { Settings } from './components/Settings';
import { TestCases } from './components/TestCases';

interface MenuItem {
  id: number;
  title: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  {
    id: 1,
    title: 'Requirement Analysis',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: 2,
    title: 'Test Cases Generator',
    icon: <TestTubes className="w-5 h-5" />,
  },
  {
    id: 3,
    title: 'Test Data Generator',
    icon: <Database className="w-5 h-5" />,
  },
  {
    id: 4,
    title: 'Swagger - API',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 5,
    title: 'Regression Testing Identification',
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    id: 6,
    title: 'Chat Bot',
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    id: 7,
    title: 'QA Dashboard',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    id: 8,
    title: 'Data Testing',
    icon: <CheckSquare className="w-5 h-5" />,
  },
  {
    id: 9,
    title: 'Visual Testing',
    icon: <Eye className="w-5 h-5" />,
  },
  {
    id: 10,
    title: 'Generate No Code',
    icon: <Wand2 className="w-5 h-5" />,
  },
  {
    id: 11,
    title: 'Code Conversion',
    icon: <Code2 className="w-5 h-5" />,
  },
  {
    id: 12,
    title: 'Test Cases',
    icon: <List className="w-5 h-5" />,
  },
  {
    id: 13,
    title: 'Settings',
    icon: <SettingsIcon className="w-5 h-5" />,
  },
];

function App() {
  const [selectedMenu, setSelectedMenu] = useState<number>(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const selectedItem = menuItems.find((item) => item.id === selectedMenu);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-gradient-to-b from-blue-900 to-blue-800 transition-all duration-300 overflow-hidden`}
      >
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-2xl font-bold text-white">QA Suite</h1>
          <p className="text-blue-100 text-sm mt-1">Automation Tools</p>
        </div>

        <nav className="mt-6 space-y-1 px-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedMenu(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left group ${
                selectedMenu === item.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              <span className="flex-1 text-sm font-medium truncate">{item.title}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-700"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h2 className="text-2xl font-bold text-slate-900">{selectedItem?.title}</h2>
          <div className="w-9" />
        </div>

        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl">
            {selectedMenu === 1 ? (
              <RequirementAnalysis />
            ) : selectedMenu === 12 ? (
              <TestCases />
            ) : selectedMenu === 13 ? (
              <Settings />
            ) : (
              <div className="bg-white rounded-xl shadow-md p-12 border border-slate-200">
                <div className="flex justify-center mb-6 text-blue-600">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                    {selectedItem?.icon}
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4 text-center">
                  {selectedItem?.title}
                </h3>
                <p className="text-slate-600 text-lg text-center leading-relaxed">
                  Welcome to the {selectedItem?.title} module. This is where the functionality will be
                  implemented.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
