import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjhamludettoemzbfqoo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqaGFtbHVkZXR0b2VtemJmcW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMzI0NzYsImV4cCI6MjA5NjcwODQ3Nn0.XHY2H85UQeSvOJLkFOeGcYEdWDVLcsvTDTMFnqSX4Sk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helper functions
export const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: 'Staff',
        approved: false,
      },
    },
  });
  return { data, error };
};

export const checkUserApproved = async (email: string, userId: string): Promise<boolean> => {
  // Check if user is owner (always approved)
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.user_metadata?.role === 'Owner') return true;
  
  // Check signup_requests table for approval status
  const { data } = await supabase
    .from('signup_requests')
    .select('status')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (data?.status === 'Approved') return true;
  if (data?.status === 'Pending' || data?.status === 'Rejected') return false;
  
  // Fallback: check user metadata
  return user?.user_metadata?.approved === true;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};
