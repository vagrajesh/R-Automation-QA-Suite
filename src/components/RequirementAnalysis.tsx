import { useState } from 'react';
import { Plus, Trash2, Link2 } from 'lucide-react';

interface Requirement {
  id: string;
  title: string;
  userStory: string;
  acceptanceCriteria: string[];
  serviceNowTicket: string;
}

export function RequirementAnalysis() {
  const [requirements, setRequirements] = useState<Requirement[]>([
    {
      id: '1',
      title: 'User Login Feature',
      userStory: 'As a user, I want to login securely so that I can access my account',
      acceptanceCriteria: [
        'User can enter email and password',
        'System validates credentials against database',
        'Session token is created on successful login',
      ],
      serviceNowTicket: 'SNOW-12345',
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    userStory: '',
    acceptanceCriteria: '',
    serviceNowTicket: '',
  });

  const handleAddRequirement = () => {
    if (formData.title && formData.userStory) {
      const newRequirement: Requirement = {
        id: Date.now().toString(),
        title: formData.title,
        userStory: formData.userStory,
        acceptanceCriteria: formData.acceptanceCriteria
          .split('\n')
          .filter((c) => c.trim())
          .map((c) => c.trim()),
        serviceNowTicket: formData.serviceNowTicket,
      };
      setRequirements([...requirements, newRequirement]);
      setFormData({ title: '', userStory: '', acceptanceCriteria: '', serviceNowTicket: '' });
      setShowForm(false);
    }
  };

  const handleDeleteRequirement = (id: string) => {
    setRequirements(requirements.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-slate-900">Requirements</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Requirement
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Requirement title"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">User Story</label>
              <textarea
                value={formData.userStory}
                onChange={(e) => setFormData({ ...formData, userStory: e.target.value })}
                placeholder="As a [user], I want to [action] so that [benefit]"
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Acceptance Criteria (one per line)
              </label>
              <textarea
                value={formData.acceptanceCriteria}
                onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })}
                placeholder="Given... When... Then..."
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                ServiceNow Ticket
              </label>
              <input
                type="text"
                value={formData.serviceNowTicket}
                onChange={(e) => setFormData({ ...formData, serviceNowTicket: e.target.value })}
                placeholder="SNOW-12345"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddRequirement}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Save Requirement
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-300 text-slate-700 py-2 rounded-lg hover:bg-slate-400 transition-colors font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {requirements.map((req) => (
          <div key={req.id} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-xl font-bold text-slate-900">{req.title}</h4>
              <button
                onClick={() => handleDeleteRequirement(req.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-semibold text-slate-700 mb-2">User Story</h5>
                <p className="text-slate-600 italic border-l-4 border-blue-400 pl-4">{req.userStory}</p>
              </div>

              <div>
                <h5 className="text-sm font-semibold text-slate-700 mb-3">Acceptance Criteria</h5>
                <ul className="space-y-2">
                  {req.acceptanceCriteria.map((criteria, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold mt-0.5">•</span>
                      <span className="text-slate-600">{criteria}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {req.serviceNowTicket && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                  <Link2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-slate-700">ServiceNow:</span>
                  <button className="text-green-600 hover:text-green-700 font-semibold">
                    {req.serviceNowTicket}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
