import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, Megaphone, Settings, Database, Activity, Search, Columns, ChevronDown, ChevronRight, Mail, Phone, MessageSquare } from 'lucide-react'
import SearchView from './components/SearchView'
import PipelineView from './components/PipelineView'
import DashboardView from './components/DashboardView'
import LeadsView from './components/LeadsView'
import CampaignsView from './components/CampaignsView'
import OutreachView from './components/OutreachView'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [outreachOpen, setOutreachOpen] = useState(false)

  // Listen for hash changes from SearchView clicks
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.split('?')[0] // Get hash without params
      if (hash === '#leads') {
        setActiveTab('leads')
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />
      case 'search':
        return <SearchView />
      case 'leads':
        return <LeadsView />
      case 'pipeline':
        return <PipelineView />
      case 'campaigns':
        return <CampaignsView />
      case 'outreach-email':
        return <OutreachView />
      case 'outreach-whatsapp':
        return <LeadsView filterTier="WHATSAPP" />
      case 'outreach-coldcall':
        return <LeadsView filterTier="COLDCALL" />
      case 'interactions':
        return <div className="p-6"><h1 className="text-3xl font-bold text-slate-800">Interactions</h1><p className="mt-4 text-slate-600">View all communication logs.</p></div>
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

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" id="dashboard" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarItem icon={<Search size={20} />} label="Search" id="search" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarItem icon={<Users size={20} />} label="Leads" id="leads" activeTab={activeTab} setActiveTab={setActiveTab} />
          <SidebarItem icon={<Columns size={20} />} label="Pipeline" id="pipeline" activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Outreach Dropdown */}
          <div className="space-y-1">
            <button
              onClick={() => setOutreachOpen(!outreachOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Megaphone size={20} />
                <span className="font-medium">Outreach</span>
              </div>
              {outreachOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {outreachOpen && (
              <div className="pl-9 space-y-1 animate-in slide-in-from-top-2 duration-200">
                <SidebarItem
                  icon={<Mail size={16} />}
                  label="Email" id="outreach-email"
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  subItem
                />
                <SidebarItem
                  icon={<MessageSquare size={16} />}
                  label="WhatsApp" id="outreach-whatsapp"
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  subItem
                />
                <SidebarItem
                  icon={<Phone size={16} />}
                  label="Cold Call" id="outreach-coldcall"
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  subItem
                />
              </div>
            )}
          </div>

          <SidebarItem icon={<Activity size={20} />} label="Interactions" id="interactions" activeTab={activeTab} setActiveTab={setActiveTab} />
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
