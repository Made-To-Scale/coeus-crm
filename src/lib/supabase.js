import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseUrl = rawUrl.trim().replace(/\/$/, '')
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

const isValidUrl = supabaseUrl && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))

export const supabase = isValidUrl
    ? createClient(supabaseUrl, supabaseAnonKey, {
        db: { schema: 'coeus' },
    })
    : {
        from: () => ({
            select: () => ({
                eq: () => ({
                    order: () => ({ single: () => Promise.resolve({ data: null, error: 'Invalid Supabase URL' }) })
                }),
                order: () => Promise.resolve({ data: [], error: 'Invalid Supabase URL' }),
                neq: () => ({ order: () => Promise.resolve({ data: [], error: 'Invalid Supabase URL' }) })
            }),
            update: () => ({ eq: () => Promise.resolve({ error: 'Invalid Supabase URL' }) }),
            insert: () => ({ select: () => Promise.resolve({ data: [], error: 'Invalid Supabase URL' }) }),
            delete: () => ({ eq: () => Promise.resolve({ error: 'Invalid Supabase URL' }) }),
        })
    }
