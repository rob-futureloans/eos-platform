/*
  # Setup Authentication Accounts for Existing Users

  This migration creates Supabase Auth accounts for all existing users in the users table.

  1. Creates auth accounts for each user with a temporary password: TempPass2024!
  2. Links the auth.users.id to the public.users.id
  3. Sets up email identities for each user

  ## Important
  - All users can now log in with their email and password: TempPass2024!
  - Users should change their password after first login
  - Super users: andrea@future.loans, andy@future.loans, jaime@future.loans,
    jason@future.loans, mitchellm@future.loans, nate@future.loans,
    rob@future.loans, robert@future.loans, rocks@future.loans
*/

DO $$
DECLARE
  user_record RECORD;
  temp_password TEXT := 'TempPass2024!';
BEGIN
  FOR user_record IN
    SELECT id, email, first_name, last_name, role
    FROM public.users
    ORDER BY email
  LOOP
    BEGIN
      -- Create auth user
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        user_record.id,
        'authenticated',
        'authenticated',
        user_record.email,
        crypt(temp_password, gen_salt('bf')),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object(
          'first_name', user_record.first_name,
          'last_name', user_record.last_name,
          'role', user_record.role
        ),
        NOW(),
        NOW(),
        '',
        ''
      )
      ON CONFLICT (id) DO NOTHING;

      -- Create identity
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        user_record.id,
        jsonb_build_object(
          'sub', user_record.id::text,
          'email', user_record.email
        ),
        'email',
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (provider, user_id) DO NOTHING;

    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error for %: %', user_record.email, SQLERRM;
    END;
  END LOOP;
END $$;
