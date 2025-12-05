import React, { useState, useEffect } from 'react';

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  type: 'percentage' | 'fixed';
  region: string;
  isActive: boolean;
  createdAt: string;
}

interface TaxRule {
  id: string;
  name: string;
  conditions: string[];
  taxRates: string[];
  priority: number;
  isActive: boolean;
}

const Tax: React.FC = () => {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [showCreateRateModal, setShowCreateRateModal] = useState(false);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [showEditRateModal, setShowEditRateModal] = useState(false);
  const [showEditRuleModal, setShowEditRuleModal] = useState(false);
  const [selectedRate, setSelectedRate] = useState<TaxRate | null>(null);
  const [selectedRule, setSelectedRule] = useState<TaxRule | null>(null);
  const [activeTab, setActiveTab] = useState<'rates' | 'rules'>('rates');
  const [loading, setLoading] = useState(false);

  // Load tax data from API
  useEffect(() => {
    loadTaxData();
  }, []);

  const loadTaxData = async () => {
    try {
      setLoading(true);
      const getApiBase = () => {
        // Always use production URL - no environment variables
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname
          if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
            return `${window.location.protocol}//${window.location.host}/api`
          }
        }
        return 'https://thenefol.com/api'
      }
      const apiBase = getApiBase();
      const [ratesRes, rulesRes] = await Promise.all([
        fetch(`${apiBase}/api/tax-rates`),
        fetch(`${apiBase}/api/tax-rules`)
      ]);
      
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setTaxRates(ratesData);
      }
      
      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setTaxRules(rulesData);
      }
    } catch (error) {
      console.error('Failed to load tax data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTaxRate = async (rateData: Partial<TaxRate>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/tax/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rateData)
      });
      
      if (response.ok) {
        const newRate = await response.json();
        setTaxRates([...taxRates, newRate]);
        setShowCreateRateModal(false);
      }
    } catch (error) {
      console.error('Error creating tax rate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTaxRule = async (ruleData: Partial<TaxRule>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/tax/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });
      
      if (response.ok) {
        const newRule = await response.json();
        setTaxRules([...taxRules, newRule]);
        setShowCreateRuleModal(false);
      }
    } catch (error) {
      console.error('Error creating tax rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRateStatus = async (rateId: string) => {
    setLoading(true);
    try {
      const rate = taxRates.find(r => r.id === rateId);
      if (!rate) return;

      const response = await fetch(`/api/tax/rates/${rateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rate.isActive })
      });
      
      if (response.ok) {
        setTaxRates(taxRates.map(r => 
          r.id === rateId ? { ...r, isActive: !r.isActive } : r
        ));
      }
    } catch (error) {
      console.error('Error updating tax rate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRuleStatus = async (ruleId: string) => {
    setLoading(true);
    try {
      const rule = taxRules.find(r => r.id === ruleId);
      if (!rule) return;

      const response = await fetch(`/api/tax/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive })
      });
      
      if (response.ok) {
        setTaxRules(taxRules.map(r => 
          r.id === ruleId ? { ...r, isActive: !r.isActive } : r
        ));
      }
    } catch (error) {
      console.error('Error updating tax rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTax = async (amount: number, region: string, productType: string) => {
    try {
      const response = await fetch('/api/tax/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, region, productType })
      });
      
      if (response.ok) {
        const result = await response.json();
        return result;
      }
    } catch (error) {
      console.error('Error calculating tax:', error);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Management</h1>
          <p className="text-gray-600">Configure tax rates and rules for your store</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateRateModal(true)}
            className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
          >
            Add Tax Rate
          </button>
          <button
            onClick={() => setShowCreateRuleModal(true)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Add Tax Rule
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Total Tax Rates</div>
          <div className="text-2xl font-bold text-gray-900">{taxRates.length}</div>
        </div>
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Active Rates</div>
          <div className="text-2xl font-bold text-green-600">
            {taxRates.filter(rate => rate.isActive).length}
          </div>
        </div>
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Tax Rules</div>
          <div className="text-2xl font-bold text-gray-900">{taxRules.length}</div>
        </div>
        <div className="metric-card">
          <div className="text-sm font-medium text-gray-600">Active Rules</div>
          <div className="text-2xl font-bold text-green-600">
            {taxRules.filter(rule => rule.isActive).length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('rates')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rates'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tax Rates
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rules'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tax Rules
            </button>
          </nav>
        </div>
      </div>

      {/* Tax Rates Tab */}
      {activeTab === 'rates' && (
        <div className="metric-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {taxRates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rate.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rate.type === 'percentage' ? `${rate.rate}%` : `$${rate.rate}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        rate.type === 'percentage' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {rate.type.charAt(0).toUpperCase() + rate.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rate.region}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        rate.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rate.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleRateStatus(rate.id)}
                          className={`${
                            rate.isActive 
                              ? 'text-red-600 hover:text-red-800' 
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {rate.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRate(rate);
                            setShowEditRateModal(true);
                          }}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tax Rules Tab */}
      {activeTab === 'rules' && (
        <div className="metric-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conditions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tax Rates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {taxRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rule.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        {rule.conditions.map((condition, index) => (
                          <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {condition}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        {rule.taxRates.map((rateId, index) => {
                          const rate = taxRates.find(r => r.id === rateId);
                          return rate ? (
                            <div key={index} className="text-xs bg-blue-100 px-2 py-1 rounded">
                              {rate.name}
                            </div>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rule.priority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        rule.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleToggleRuleStatus(rule.id)}
                          className={`${
                            rule.isActive 
                              ? 'text-red-600 hover:text-red-800' 
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {rule.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRule(rule);
                            setShowEditRuleModal(true);
                          }}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tax Calculator */}
      <div className="metric-card mt-6">
        <h3 className="text-lg font-semibold mb-4">Tax Calculator</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent">
              <option value="India">India</option>
              <option value="USA">USA</option>
              <option value="UK">UK</option>
              <option value="Canada">Canada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Type
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent">
              <option value="Beauty">Beauty</option>
              <option value="Skincare">Skincare</option>
              <option value="Haircare">Haircare</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90">
            Calculate Tax
          </button>
        </div>
      </div>

      {/* Create Tax Rate Modal */}
      {showCreateRateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Tax Rate</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              setShowCreateRateModal(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent">
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateRateModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
                >
                  Create Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Tax Rule Modal */}
      {showCreateRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Create Tax Rule</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              setShowCreateRuleModal(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conditions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter conditions (one per line)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rates
                  </label>
                  <div className="space-y-2">
                    {taxRates.map((rate) => (
                      <label key={rate.id} className="flex items-center">
                        <input
                          type="checkbox"
                          className="mr-2"
                        />
                        <span className="text-sm">{rate.name} ({rate.rate}%)</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateRuleModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tax;




