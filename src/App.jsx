import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, Megaphone, Settings, Database, Activity, Search } from 'lucide-react'
import SearchView from './components/SearchView'

import { supabase } from './lib/supabaseClient'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />
      case 'search':
        return <SearchView />
      case 'leads':

        return <LeadsView />
      case 'campaigns':
        return <div className="p-6"><h1 className="text-3xl font-bold text-slate-800">Campaigns</h1><p className="mt-4 text-slate-600">Setup and track outreach campaigns.</p></div>
      case 'interactions':
        return <div className="p-6"><h1 className="text-3xl font-bold text-slate-800">Interactions</h1><p className="mt-4 text-slate-600">View all communication logs.</p></div>
      case 'data':
        return <div className="p-6"><h1 className="text-3xl font-bold text-slate-800">Data Sources</h1><p className="mt-4 text-slate-600">Manage scraping sources.</p></div>
      case 'settings':
        return <div className="p-6"><h1 className="text-3xl font-bold text-slate-800">Settings</h1><p className="mt-4 text-slate-600">System configuration.</p></div>
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-100 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Coeus</h1>
          <p className="text-xs text-slate-500 mt-1">Outreach Intelligence</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" id="dashboard" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarItem icon={<Search size={20} />} label="Search" id="search" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarItem icon={<Users size={20} />} label="Leads" id="leads" activeTab={activeTab} setActiveTab={setActiveTab} />

          <SidebarItem icon={<Megaphone size={20} />} label="Campaigns" id="campaigns" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarItem icon={<Activity size={20} />} label="Interactions" id="interactions" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarItem icon={<Database size={20} />} label="Data Sources" id="data" activeTab={activeTab} setActiveTab={setActiveTab} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <SidebarItem icon={<Settings size={20} />} label="Settings" id="settings" activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  )
}

function DashboardView() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
      <p className="mt-4 text-slate-600">Welcome to Coeus Outreach System.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <StatCard title="Total Leads" value="0" />
        <StatCard title="Active Campaigns" value="0" />
        <StatCard title="Emails Sent" value="0" />
      </div>
    </div>
  )
}

import LeadsView from './components/LeadsView'


function StatCard({ title, value }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-slate-800">{value}</p>
    </div>
  )
}

function SidebarItem({ icon, label, id, activeTab, setActiveTab }) {
  const isActive = activeTab === id
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  )
}

export default App
