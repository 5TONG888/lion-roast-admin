// @ts-nocheck
/* eslint-disable */
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function IndependentAdminApp() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  const [stats, setStats] = useState({ totalUsers: 0, totalMedia: 0, totalRatings: 0, avgRating: '0.0' })
  const [profilesList, setProfilesList] = useState<any[]>([])
  const [mediaList, setMediaList] = useState<any[]>([])
  const [ratingsList, setRatingsList] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ prompt: '', content: '', image_url: '' })

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)

      if (session?.user) {
        const { data } = await supabase
            .from('profiles')
            .select('is_superadmin')
            .eq('id', session.user.id)
            .single()

        if (data && data.is_superadmin === true) {
          setIsAdmin(true)
          fetchAllAdminData()
        }
      }
      setCheckingAdmin(false)
    }
    checkUser()
  }, [])

  const fetchAllAdminData = async () => {
    setDataLoading(true)
    try {
      const { data: profiles } = await supabase.from('profiles').select('*')
      setProfilesList(profiles || [])

      const { data: media } = await supabase.from('generations').select('*').order('created_at', { ascending: false })
      setMediaList(media || [])

      const { data: genVotes } = await supabase.from('generation_votes').select('*')
      const { data: generalVotes } = await supabase.from('votes').select('*')

      const formattedGenVotes = (genVotes || []).map(v => ({
        id: v.id || v.generation_id || 'N/A',
        source: 'Ratings / Upvotes',
        score: v.vote ?? v.rating ?? 0,
        user_id: v.user_id,
        created_at: v.created_at
      }))

      const formattedGeneralVotes = (generalVotes || []).map(v => ({
        id: v.id || 'N/A',
        source: 'Ratings / Upvotes',
        score: v.vote_type === 'up' ? 1 : v.vote_type === 'down' ? -1 : 0,
        user_id: v.user_id,
        created_at: v.created_at
      }))

      const combinedRatings = [...formattedGenVotes, ...formattedGeneralVotes]
      setRatingsList(combinedRatings)

      const totalUsers = profiles?.length || 0
      const totalMedia = media?.length || 0
      const totalRatings = combinedRatings.length
      let avgRating = '0.0'
      if (totalRatings > 0) {
        const sum = combinedRatings.reduce((acc, curr) => acc + curr.score, 0)
        avgRating = (sum / totalRatings).toFixed(1)
      }

      setStats({ totalUsers, totalMedia, totalRatings, avgRating })
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: origin }
    })
  }

  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      const { error } = await supabase
          .from('generations')
          .update({ prompt: formData.prompt, content: formData.content, image_url: formData.image_url })
          .eq('id', editingId)

      if (error) alert('Error: ' + error.message)
      else {
        setShowModal(false)
        setEditingId(null)
        setFormData({ prompt: '', content: '', image_url: '' })
        fetchAllAdminData()
      }
    } else {
      const { error } = await supabase
          .from('generations')
          .insert([{ prompt: formData.prompt, content: formData.content, image_url: formData.image_url, user_id: user.id }])

      if (error) alert('Error: ' + error.message)
      else {
        setShowModal(false)
        setFormData({ prompt: '', content: '', image_url: '' })
        fetchAllAdminData()
      }
    }
  }

  const handleDeleteMedia = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media asset?')) return
    const { error } = await supabase.from('generations').delete().eq('id', id)
    if (error) alert('Error: ' + error.message)
    else setMediaList(mediaList.filter(item => item.id !== id))
  }

  if (loading || checkingAdmin) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
          <p className="animate-pulse text-lg">Authenticating Admin Portal... 🛡️</p>
        </div>
    )
  }

  if (!user) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white px-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center shadow-xl">
            <span className="text-4xl mb-4 block">🔒</span>
            <h1 className="text-2xl font-bold mb-2">Admin Panel Login</h1>
            <p className="text-slate-400 text-sm mb-6">Restricted. Google authentication required.</p>
            <button
                onClick={handleGoogleLogin}
                className="w-full py-3 px-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition shadow"
            >
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
            <p className="text-red-200/80 text-sm mb-6">
              Account <span className="font-mono text-white">{user.email}</span> does not have superadmin rights (`is_superadmin == TRUE`).
            </p>
            <button
                onClick={async () => { await supabase.auth.signOut(); location.reload(); }}
                className="px-6 py-2 bg-slate-800 text-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-700 transition"
            >
              Sign Out & Switch Account
            </button>
          </div>
        </div>
    )
  }

  return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-10 pb-6 border-b border-slate-800">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">🛡️ Standalone Admin Command Center</h1>
              <p className="text-sm text-slate-400 mt-1">Superadmin authenticated: {user.email}</p>
            </div>
            <button
                onClick={async () => { await supabase.auth.signOut(); location.reload(); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition"
            >
              Sign Out
            </button>
          </header>

          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4">📊 Statistics Dashboard</h2>
            {dataLoading ? (
                <div className="text-slate-400 text-sm animate-pulse">Loading analytics...</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow">
                    <p className="text-slate-400 text-sm">Total Users</p>
                    <p className="text-3xl font-black mt-2 text-indigo-400">{stats.totalUsers}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow">
                    <p className="text-slate-400 text-sm">AI Media Assets</p>
                    <p className="text-3xl font-black mt-2 text-emerald-400">{stats.totalMedia}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow">
                    <p className="text-slate-400 text-sm">Total Ratings / Votes</p>
                    <p className="text-3xl font-black mt-2 text-amber-400">{stats.totalRatings}</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow">
                    <p className="text-slate-400 text-sm">Average Score</p>
                    <p className="text-3xl font-black mt-2 text-pink-400">{stats.avgRating}</p>
                  </div>
                </div>
            )}
          </div>

          <div className="mb-10 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
            <h2 className="text-xl font-bold mb-4">👥 Users / Profiles Management (READ)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Superadmin</th>
                </tr>
                </thead>
                <tbody>
                {profilesList.map(p => (
                    <tr key={p.id} className="border-b border-slate-800/50">
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{p.id}</td>
                      <td className="py-3 px-4">{p.email || 'N/A'}</td>
                      <td className="py-3 px-4">
                        {p.is_superadmin ? <span className="text-emerald-400 font-bold">TRUE</span> : <span className="text-slate-500">FALSE</span>}
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-10 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">🎨 AI Generated Media Management (CRUD)</h2>
              <button
                  onClick={() => { setEditingId(null); setFormData({ prompt: '', content: '', image_url: '' }); setShowModal(true); }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition"
              >
                + Create New Media
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Prompt</th>
                  <th className="py-3 px-4">Content</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
                </thead>
                <tbody>
                {mediaList.map(m => (
                    <tr key={m.id} className="border-b border-slate-800/50">
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{m.id}</td>
                      <td className="py-3 px-4 max-w-xs truncate">{m.prompt || 'N/A'}</td>
                      <td className="py-3 px-4 max-w-xs truncate">{m.content || 'N/A'}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button onClick={() => { setEditingId(m.id); setFormData({ prompt: m.prompt || '', content: m.content || '', image_url: m.image_url || '' }); setShowModal(true); }} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition">Edit</button>
                        <button onClick={() => handleDeleteMedia(m.id)} className="px-3 py-1 bg-red-950 hover:bg-red-900 text-red-300 text-xs rounded-lg transition">Delete</button>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-10 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
            <h2 className="text-xl font-bold mb-4">⭐ Upvotes / Downvotes / Ratings Management (READ)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Score / Value</th>
                  <th className="py-3 px-4">User ID</th>
                </tr>
                </thead>
                <tbody>
                {ratingsList.map((r, index) => (
                    <tr key={r.id + index} className="border-b border-slate-800/50">
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{r.id}</td>
                      <td className="py-3 px-4 text-xs text-indigo-300">{r.source}</td>
                      <td className="py-3 px-4 font-bold text-amber-400">{r.score}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">{r.user_id || 'N/A'}</td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>

          {showModal && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full">
                  <h3 className="text-xl font-bold mb-4">{editingId ? 'Edit AI Media' : 'Create AI Media'}</h3>
                  <form onSubmit={handleSaveMedia} className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Prompt</label>
                      <input
                          type="text"
                          value={formData.prompt}
                          onChange={e => setFormData({ ...formData, prompt: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                          required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Content</label>
                      <input
                          type="text"
                          value={formData.content}
                          onChange={e => setFormData({ ...formData, content: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Image URL</label>
                      <input
                          type="text"
                          value={formData.image_url}
                          onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 rounded-xl text-sm">Cancel</button>
                      <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold">Save</button>
                    </div>
                  </form>
                </div>
              </div>
          )}

        </div>
      </div>
  )
}