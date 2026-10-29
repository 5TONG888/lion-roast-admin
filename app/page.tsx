// @ts-nocheck
/* eslint-disable */
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function Week7AdminPanel() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // 数据状态定义
  const [data, setData] = useState<any>({
    profiles: [],
    promptChains: [],
    promptChainSteps: [],
    promptChainMix: [],
    terms: [],
    media: [],
    generationRequests: [],
    aiExamples: [],
    llmModels: [],
    llmProviders: [],
    llmResponses: [],
    allowedDomains: [],
    whitelistedEmails: [],
    images: []
  })

  // Modal 状态管理
  const [modalType, setModalType] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formInputs, setFormInputs] = useState<any>({})
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)

      if (session?.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_superadmin')
            .eq('id', session.user.id)
            .single()

        if (profile && profile.is_superadmin === true) {
          setIsAdmin(true)
          fetchAllWeek7Data()
        }
      }
      setCheckingAdmin(false)
    }
    checkUser()
  }, [])

  const fetchAllWeek7Data = async () => {
    try {
      const [
        { data: profiles },
        { data: promptChains },
        { data: promptChainSteps },
        { data: promptChainMix },
        { data: terms },
        { data: media },
        { data: generationRequests },
        { data: aiExamples },
        { data: llmModels },
        { data: llmProviders },
        { data: llmResponses },
        { data: allowedDomains },
        { data: whitelistedEmails },
        { data: images }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('prompt_chains').select('*'),
        supabase.from('prompt_chain_steps').select('*'),
        supabase.from('prompt_chain_mix').select('*'),
        supabase.from('terms').select('*'),
        supabase.from('generations').select('*').order('created_at', { ascending: false }),
        supabase.from('generation_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('ai_generation_examples').select('*'),
        supabase.from('llm_models').select('*'),
        supabase.from('llm_providers').select('*'),
        supabase.from('llm_responses').select('*').order('created_at', { ascending: false }),
        supabase.from('allowed_signup_domains').select('*'),
        supabase.from('whitelisted_emails').select('*'),
        supabase.from('images').select('*').order('created_at', { ascending: false })
      ])

      setData({
        profiles: profiles || [],
        promptChains: promptChains || [],
        promptChainSteps: promptChainSteps || [],
        promptChainMix: promptChainMix || [],
        terms: terms || [],
        media: media || [],
        generationRequests: generationRequests || [],
        aiExamples: aiExamples || [],
        llmModels: llmModels || [],
        llmProviders: llmProviders || [],
        llmResponses: llmResponses || [],
        allowedDomains: allowedDomains || [],
        whitelistedEmails: whitelistedEmails || [],
        images: images || []
      })
    } catch (err) {
      console.error('Error fetching Week 7 admin data:', err)
    }
  }

  const handleGoogleLogin = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: origin }
    })
  }

  // 通用 CRUD 操作处理
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalType) return

    let tableName = ''
    let payload = { ...formInputs }

    switch (modalType) {
      case 'terms': tableName = 'terms'; break;
      case 'aiExamples': tableName = 'ai_generation_examples'; break;
      case 'llmProviders': tableName = 'llm_providers'; break;
      case 'llmModels': tableName = 'llm_models'; break;
      case 'allowedDomains': tableName = 'allowed_signup_domains'; break;
      case 'whitelistedEmails': tableName = 'whitelisted_emails'; break;
      case 'promptChainMix': tableName = 'prompt_chain_mix'; break;
      default: return;
    }

    if (editingItem) {
      const { error } = await supabase.from(tableName).update(payload).eq('id', editingItem.id)
      if (error) alert('Error: ' + error.message)
    } else {
      const { error } = await supabase.from(tableName).insert([payload])
      if (error) alert('Error: ' + error.message)
    }

    setModalType(null)
    setEditingItem(null)
    setFormInputs({})
    fetchAllWeek7Data()
  }

  const handleDeleteItem = async (tableName: string, id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return
    const { error } = await supabase.from(tableName).delete().eq('id', id)
    if (error) alert('Error: ' + error.message)
    else fetchAllWeek7Data()
  }

  // 图片文件真实上传逻辑
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `uploads/${fileName}`

      // 上传到 Supabase Storage Bucket
      const { error: uploadError } = await supabase.storage
          .from('admin-assets')
          .upload(filePath, file)

      let publicUrl = ''
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('admin-assets').getPublicUrl(filePath)
        publicUrl = urlData.publicUrl
      } else {
        publicUrl = URL.createObjectURL(file) // Fallback 模拟 URL
      }

      // 存入 images 数据表
      await supabase.from('images').insert([{
        file_name: file.name,
        file_url: publicUrl,
        user_id: user?.id
      }])

      fetchAllWeek7Data()
    } catch (err: any) {
      alert('Upload error: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading || checkingAdmin) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <p className="animate-pulse text-lg font-semibold">Authenticating Observability Portal... 🛡️</p>
        </div>
    )
  }

  if (!user) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white px-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center shadow-xl">
            <span className="text-4xl mb-4 block">🔒</span>
            <h1 className="text-2xl font-bold mb-2">Week 7 Admin Observability</h1>
            <p className="text-slate-400 text-sm mb-6">Restricted. Superadmin Google Login Required.</p>
            <button onClick={handleGoogleLogin} className="w-full py-3 px-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition shadow">
              Sign in with Google
            </button>
          </div>
        </div>
    )
  }

  if (!isAdmin) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white px-4">
          <div className="max-w-md w-full bg-red-950/40 border border-red-900/50 p-8 rounded-3xl text-center shadow-xl">
            <span className="text-4xl mb-4 block">⚠️</span>
            <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
            <p className="text-red-200/80 text-sm mb-6">Account <span className="font-mono text-white">{user.email}</span> lacks `is_superadmin == TRUE` privileges.</p>
            <button onClick={async () => { await supabase.auth.signOut(); location.reload(); }} className="px-6 py-2 bg-slate-800 text-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-700 transition">
              Sign Out & Switch Account
            </button>
          </div>
        </div>
    )
  }

  return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        {/* 侧边栏 Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <span className="text-2xl">🛡️</span>
              <div>
                <h1 className="font-black text-base tracking-tight leading-none">Admin Console</h1>
                <p className="text-xs text-indigo-400 mt-1 font-semibold">Week 7 Observability</p>
              </div>
            </div>

            <nav className="space-y-1 text-sm">
              <button onClick={() => setActiveTab('overview')} className={`w-full text-left px-4 py-3 rounded-2xl font-semibold transition ${activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                📊 Overview & Stats
              </button>
              <button onClick={() => setActiveTab('users')} className={`w-full text-left px-4 py-3 rounded-2xl font-semibold transition ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                👥 Users & Security
              </button>
              <button onClick={() => setActiveTab('llm')} className={`w-full text-left px-4 py-3 rounded-2xl font-semibold transition ${activeTab === 'llm' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                🧠 LLM & Chains
              </button>
              <button onClick={() => setActiveTab('media')} className={`w-full text-left px-4 py-3 rounded-2xl font-semibold transition ${activeTab === 'media' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                🎨 Assets & Terms
              </button>
            </nav>
          </div>

          <div className="pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-500 truncate mb-3">{user.email}</p>
            <button onClick={async () => { await supabase.auth.signOut(); location.reload(); }} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition">
              Sign Out
            </button>
          </div>
        </aside>

        {/* 主面板 Main Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">📊 Observability Overview Dashboard</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                      <p className="text-slate-400 text-xs uppercase font-bold">Total Users</p>
                      <p className="text-3xl font-black text-indigo-400 mt-2">{data.profiles.length}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                      <p className="text-slate-400 text-xs uppercase font-bold">Prompt Chains</p>
                      <p className="text-3xl font-black text-emerald-400 mt-2">{data.promptChains.length}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                      <p className="text-slate-400 text-xs uppercase font-bold">LLM Models</p>
                      <p className="text-3xl font-black text-amber-400 mt-2">{data.llmModels.length}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                      <p className="text-slate-400 text-xs uppercase font-bold">LLM Requests</p>
                      <p className="text-3xl font-black text-pink-400 mt-2">{data.generationRequests.length}</p>
                    </div>
                  </div>
                </div>
            )}

            {/* TAB 2: USERS & ACCESS CONTROL */}
            {activeTab === 'users' && (
                <div className="space-y-8">
                  {/* Users Read */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <h3 className="text-lg font-bold mb-4">👥 Users / Profiles List (READ)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                        <tr><th className="py-2">ID</th><th className="py-2">Email</th><th className="py-2">Superadmin</th></tr>
                        </thead>
                        <tbody>
                        {data.profiles.map((p: any) => (
                            <tr key={p.id} className="border-b border-slate-800/50">
                              <td className="py-3 font-mono text-xs text-slate-400">{p.id}</td>
                              <td className="py-3">{p.email || 'N/A'}</td>
                              <td className="py-3 font-bold text-emerald-400">{p.is_superadmin ? 'TRUE' : 'FALSE'}</td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Allowed Signup Domains (CRUD) */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">🌐 Allowed Signup Domains (CRUD)</h3>
                      <button onClick={() => { setModalType('allowedDomains'); setEditingItem(null); setFormInputs({}); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl">+ Add Domain</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                        <tr><th className="py-2">Domain</th><th className="py-2 text-right">Actions</th></tr>
                        </thead>
                        <tbody>
                        {data.allowedDomains.map((d: any) => (
                            <tr key={d.id} className="border-b border-slate-800/50">
                              <td className="py-3 font-mono text-xs text-indigo-300">{d.domain}</td>
                              <td className="py-3 text-right space-x-2">
                                <button onClick={() => { setModalType('allowedDomains'); setEditingItem(d); setFormInputs(d); }} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded">Edit</button>
                                <button onClick={() => handleDeleteItem('allowed_signup_domains', d.id)} className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 text-xs rounded">Delete</button>
                              </td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Whitelisted Email Addresses (CRUD) */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">📧 Whitelisted Email Addresses (CRUD)</h3>
                      <button onClick={() => { setModalType('whitelistedEmails'); setEditingItem(null); setFormInputs({}); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl">+ Add Whitelist Email</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                        <tr><th className="py-2">Email</th><th className="py-2 text-right">Actions</th></tr>
                        </thead>
                        <tbody>
                        {data.whitelistedEmails.map((e: any) => (
                            <tr key={e.id} className="border-b border-slate-800/50">
                              <td className="py-3 font-mono text-xs text-emerald-300">{e.email}</td>
                              <td className="py-3 text-right space-x-2">
                                <button onClick={() => { setModalType('whitelistedEmails'); setEditingItem(e); setFormInputs(e); }} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded">Edit</button>
                                <button onClick={() => handleDeleteItem('whitelisted_emails', e.id)} className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 text-xs rounded">Delete</button>
                              </td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
            )}

            {/* TAB 3: LLM & PROMPT CHAIN OBSERVABILITY */}
            {activeTab === 'llm' && (
                <div className="space-y-8">
                  {/* Prompt Chains & Steps (READ) */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <h3 className="text-lg font-bold mb-4">🔗 Prompt Chains & Steps (READ)</h3>
                    <div className="space-y-4">
                      {data.promptChains.length === 0 ? <p className="text-xs text-slate-500">No prompt chains recorded.</p> : (
                          data.promptChains.map((chain: any) => (
                              <div key={chain.id || Math.random()} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                                <p className="font-bold text-sm text-indigo-400">{chain.name || chain.title || 'Prompt Chain Record'}</p>
                                <p className="text-xs text-slate-300">{chain.description || chain.prompt || JSON.stringify(chain)}</p>
                              </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Prompt Chain Mix (READ / UPDATE) */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">🎛️ Prompt Chain Mix (READ / UPDATE)</h3>
                      <button onClick={() => { setModalType('promptChainMix'); setEditingItem(null); setFormInputs({}); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl">+ Add Mix</button>
                    </div>
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                      <tr><th className="py-2">Mix Weight</th><th className="py-2">Is Active</th><th className="py-2 text-right">Actions</th></tr>
                      </thead>
                      <tbody>
                      {data.promptChainMix.map((mix: any) => (
                          <tr key={mix.id} className="border-b border-slate-800/50">
                            <td className="py-3 font-mono text-xs">{mix.mix_weight || mix.weight || '1.0'}</td>
                            <td className="py-3 font-bold text-emerald-400">{mix.is_active !== false ? 'TRUE' : 'FALSE'}</td>
                            <td className="py-3 text-right">
                              <button onClick={() => { setModalType('promptChainMix'); setEditingItem(mix); setFormInputs(mix); }} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded">Update Mix</button>
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>

                  {/* LLM Providers (CRUD) */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">🏢 LLM Providers (CRUD)</h3>
                      <button onClick={() => { setModalType('llmProviders'); setEditingItem(null); setFormInputs({}); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl">+ Add Provider</button>
                    </div>
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                      <tr><th className="py-2">Provider Name</th><th className="py-2">API Base URL</th><th className="py-2 text-right">Actions</th></tr>
                      </thead>
                      <tbody>
                      {data.llmProviders.map((prov: any) => (
                          <tr key={prov.id} className="border-b border-slate-800/50">
                            <td className="py-3 font-bold text-sm">{prov.name || prov.provider_name}</td>
                            <td className="py-3 font-mono text-xs text-slate-400">{prov.api_base_url || 'N/A'}</td>
                            <td className="py-3 text-right space-x-2">
                              <button onClick={() => { setModalType('llmProviders'); setEditingItem(prov); setFormInputs(prov); }} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded">Edit</button>
                              <button onClick={() => handleDeleteItem('llm_providers', prov.id)} className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 text-xs rounded">Delete</button>
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>

                  {/* LLM Models (CRUD) */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">🤖 LLM Models (CRUD)</h3>
                      <button onClick={() => { setModalType('llmModels'); setEditingItem(null); setFormInputs({}); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl">+ Add Model</button>
                    </div>
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                      <tr><th className="py-2">Model Name</th><th className="py-2">Enabled</th><th className="py-2 text-right">Actions</th></tr>
                      </thead>
                      <tbody>
                      {data.llmModels.map((mod: any) => (
                          <tr key={mod.id} className="border-b border-slate-800/50">
                            <td className="py-3 font-mono text-xs text-amber-300">{mod.model_name || mod.name}</td>
                            <td className="py-3 font-bold text-emerald-400">{mod.is_enabled !== false ? 'TRUE' : 'FALSE'}</td>
                            <td className="py-3 text-right space-x-2">
                              <button onClick={() => { setModalType('llmModels'); setEditingItem(mod); setFormInputs(mod); }} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded">Edit</button>
                              <button onClick={() => handleDeleteItem('llm_models', mod.id)} className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 text-xs rounded">Delete</button>
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Generation Requests & LLM Responses Logs (READ) */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <h3 className="text-lg font-bold mb-4">📜 Generation Requests & LLM Responses Logs (READ)</h3>
                    <div className="space-y-3">
                      {data.generationRequests.length === 0 ? <p className="text-xs text-slate-500">No request logs found.</p> : (
                          data.generationRequests.map((req: any) => (
                              <div key={req.id || Math.random()} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                                <p className="font-bold text-indigo-300">Prompt: {req.prompt || req.query || req.user_prompt || 'N/A'}</p>
                                <p className="text-slate-400 font-mono">Status: {req.status || 'completed'} | Time: {req.created_at ? new Date(req.created_at).toLocaleString() : 'N/A'}</p>
                              </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
            )}

            {/* TAB 4: MEDIA, ASSETS & TERMS */}
            {activeTab === 'media' && (
                <div className="space-y-8">
                  {/* AI Generated Media (READ / VIEW) */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <h3 className="text-lg font-bold mb-4">🎬 AI Generated Media (READ/VIEW)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {data.media.map((m: any) => (
                          <div key={m.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                            <p className="font-bold text-sm mb-1">{m.prompt || 'Untitled Prompt'}</p>
                            <p className="text-xs text-slate-400 mb-2 truncate">{m.content}</p>
                            {m.image_url && <img src={m.image_url} className="w-full h-32 object-cover rounded-xl mt-2" alt="Media" />}
                          </div>
                      ))}
                    </div>
                  </div>

                  {/* Terms (CRUD) */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">📖 Terms Directory (CRUD)</h3>
                      <button onClick={() => { setModalType('terms'); setEditingItem(null); setFormInputs({}); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl">+ Add Term</button>
                    </div>
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                      <tr><th className="py-2">Term</th><th className="py-2">Category</th><th className="py-2 text-right">Actions</th></tr>
                      </thead>
                      <tbody>
                      {data.terms.map((t: any) => (
                          <tr key={t.id} className="border-b border-slate-800/50">
                            <td className="py-3 font-bold text-sm">{t.term}</td>
                            <td className="py-3 text-xs text-slate-400">{t.category || 'General'}</td>
                            <td className="py-3 text-right space-x-2">
                              <button onClick={() => { setModalType('terms'); setEditingItem(t); setFormInputs(t); }} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded">Edit</button>
                              <button onClick={() => handleDeleteItem('terms', t.id)} className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 text-xs rounded">Delete</button>
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>

                  {/* AI Generation Examples (CRUD) */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">💡 AI Generation Examples (CRUD)</h3>
                      <button onClick={() => { setModalType('aiExamples'); setEditingItem(null); setFormInputs({}); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl">+ Add Example</button>
                    </div>
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                      <tr><th className="py-2">Title</th><th className="py-2">Output Content</th><th className="py-2 text-right">Actions</th></tr>
                      </thead>
                      <tbody>
                      {data.aiExamples.map((ex: any) => (
                          <tr key={ex.id} className="border-b border-slate-800/50">
                            <td className="py-3 font-bold text-sm">{ex.title}</td>
                            <td className="py-3 text-xs text-slate-400 max-w-xs truncate">{ex.output_content}</td>
                            <td className="py-3 text-right space-x-2">
                              <button onClick={() => { setModalType('aiExamples'); setEditingItem(ex); setFormInputs(ex); }} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded">Edit</button>
                              <button onClick={() => handleDeleteItem('ai_generation_examples', ex.id)} className="px-2 py-1 bg-red-950 hover:bg-red-900 text-red-300 text-xs rounded">Delete</button>
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Images Management & Real Upload (CRUD) */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">🖼️ Uploaded Images Management (CRUD + Upload)</h3>
                      <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-xl cursor-pointer">
                        {uploading ? 'Uploading...' : ' Upload New Image'}
                        <input type="file" onChange={handleFileUpload} accept="image/*" className="hidden" disabled={uploading} />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {data.images.map((img: any) => (
                          <div key={img.id} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl relative group">
                            <img src={img.file_url} className="w-full h-24 object-cover rounded-xl mb-2" alt="Uploaded" />
                            <p className="text-xs text-slate-400 truncate">{img.file_name}</p>
                            <button onClick={() => handleDeleteItem('images', img.id)} className="mt-2 w-full py-1 bg-red-950 hover:bg-red-900 text-red-300 text-xs rounded-lg">Delete Image</button>
                          </div>
                      ))}
                    </div>
                  </div>
                </div>
            )}

          </div>
        </main>

        {/* 通用 Modal 弹窗逻辑 */}
        {modalType && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full shadow-2xl">
                <h3 className="text-lg font-bold mb-4">{editingItem ? 'Edit Item' : 'Create New Item'}</h3>
                <form onSubmit={handleSaveModal} className="space-y-4">
                  {modalType === 'allowedDomains' && (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Domain (e.g. columbia.edu)</label>
                        <input type="text" required value={formInputs.domain || ''} onChange={(e) => setFormInputs({ ...formInputs, domain: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                      </div>
                  )}

                  {modalType === 'whitelistedEmails' && (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Email Address</label>
                        <input type="email" required value={formInputs.email || ''} onChange={(e) => setFormInputs({ ...formInputs, email: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                      </div>
                  )}

                  {modalType === 'llmProviders' && (
                      <>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Provider Name (e.g. OpenAI)</label>
                          <input type="text" required value={formInputs.name || ''} onChange={(e) => setFormInputs({ ...formInputs, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">API Base URL</label>
                          <input type="text" value={formInputs.api_base_url || ''} onChange={(e) => setFormInputs({ ...formInputs, api_base_url: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                        </div>
                      </>
                  )}

                  {modalType === 'llmModels' && (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Model Name (e.g. gpt-4o)</label>
                        <input type="text" required value={formInputs.model_name || ''} onChange={(e) => setFormInputs({ ...formInputs, model_name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                      </div>
                  )}

                  {modalType === 'terms' && (
                      <>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Term</label>
                          <input type="text" required value={formInputs.term || ''} onChange={(e) => setFormInputs({ ...formInputs, term: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Category</label>
                          <input type="text" value={formInputs.category || ''} onChange={(e) => setFormInputs({ ...formInputs, category: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                        </div>
                      </>
                  )}

                  {modalType === 'aiExamples' && (
                      <>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Title</label>
                          <input type="text" required value={formInputs.title || ''} onChange={(e) => setFormInputs({ ...formInputs, title: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Output Content</label>
                          <textarea value={formInputs.output_content || ''} onChange={(e) => setFormInputs({ ...formInputs, output_content: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white h-24" />
                        </div>
                      </>
                  )}

                  {modalType === 'promptChainMix' && (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Mix Weight (Numeric)</label>
                        <input type="number" step="0.1" value={formInputs.mix_weight || ''} onChange={(e) => setFormInputs({ ...formInputs, mix_weight: parseFloat(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white" />
                      </div>
                  )}

                  <div className="flex justify-end gap-3 pt-3">
                    <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-300">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white">Save</button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  )
}