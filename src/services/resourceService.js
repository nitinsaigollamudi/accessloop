
import { supabase } from './supabase'

// Fetch approved resources
export async function getResources() {
  const { data, error } = await supabase
    .from('resources')
    .select(`
      *,
      categories (
        id,
        name
      )
    `)
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false })

  if (error) throw error

  return data
}

// Fetch categories
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) throw error

  return data
}

// Add a new resource
export async function createResource(resource) {
  const { data, error } = await supabase
    .from('resources')
    .insert({
      ...resource,
      approval_status: 'pending',
      availability_status: 'available',
      source: 'student'
    })
    .select()
    .single()

  if (error) throw error

  return data
}
