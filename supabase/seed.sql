-- ContentFlow demo seed.
-- Run with `supabase db reset`, then sign in with any account below.
-- All demo accounts use the password: password

create extension if not exists "pgcrypto";

do $$
declare
  admin_id uuid := '10000000-0000-0000-0000-000000000001';
  manager_id uuid := '10000000-0000-0000-0000-000000000002';
  editor_id uuid := '10000000-0000-0000-0000-000000000003';
  viewer_id uuid := '10000000-0000-0000-0000-000000000004';
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (admin_id, 'authenticated', 'authenticated', 'admin@demo.com', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Maya Chen"}', now(), now()),
    (manager_id, 'authenticated', 'authenticated', 'manager@demo.com', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Jordan Lee"}', now(), now()),
    (editor_id, 'authenticated', 'authenticated', 'editor@demo.com', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alex Rivera"}', now(), now()),
    (viewer_id, 'authenticated', 'authenticated', 'viewer@demo.com', crypt('password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sam Taylor"}', now(), now())
  on conflict (id) do update set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();
end $$;

do $$
declare
  admin_id constant uuid := '10000000-0000-0000-0000-000000000001';
  manager_id constant uuid := '10000000-0000-0000-0000-000000000002';
  editor_id constant uuid := '10000000-0000-0000-0000-000000000003';
  viewer_id constant uuid := '10000000-0000-0000-0000-000000000004';
  ws uuid;
  campaign_launch uuid;
  campaign_evergreen uuid;
  campaign_holiday uuid;
  item_id uuid;
  platform_id uuid;
  tag_id uuid;
  i integer;
  content_status public.master_status;
  content_type_value public.content_type;
  priority_value public.priority;
  assigned_id uuid;
  campaign_id uuid;
  platform public.platform_name;
  platform_status_value public.platform_status;
  item_title text;
  item_slug text;
  item_brief text;
  platform_caption text;
begin
  select id into ws from public.workspaces where created_by = admin_id order by created_at limit 1;
  if ws is null then
    raise exception 'Demo workspace was not created by the auth user trigger';
  end if;

  update public.workspaces
    set name = 'ContentFlow Demo Studio', slug = 'contentflow-demo'
    where id = ws;

  update public.profiles set full_name = 'Maya Chen', email = 'admin@demo.com', role = 'admin', job_title = 'Head of Content' where id = admin_id;
  update public.profiles set full_name = 'Jordan Lee', email = 'manager@demo.com', role = 'manager', job_title = 'Content Manager', workspace_id = ws where id = manager_id;
  update public.profiles set full_name = 'Alex Rivera', email = 'editor@demo.com', role = 'editor', job_title = 'Social Editor', workspace_id = ws where id = editor_id;
  update public.profiles set full_name = 'Sam Taylor', email = 'viewer@demo.com', role = 'viewer', job_title = 'Brand Reviewer', workspace_id = ws where id = viewer_id;

  insert into public.workspace_settings (workspace_id, timezone, default_content_type, default_priority, approval_required, checklist_required, brand_notes)
  values (ws, 'Asia/Phnom_Penh', 'image', 'medium', true, true, 'Use a warm, practical voice. Prioritize community stories, clear calls to action, and accessible captions.')
  on conflict (workspace_id) do update set timezone = excluded.timezone, brand_notes = excluded.brand_notes;

  insert into public.campaigns (workspace_id, name, description, color, start_date, end_date, owner_id, status)
  values
    (ws, 'Q4 Product Launch', 'Launch campaign for the new ContentFlow workspace experience.', '#2563eb', current_date - 18, current_date + 35, manager_id, 'active'),
    (ws, 'Evergreen Community', 'Always-on educational and community content.', '#10b981', current_date - 90, current_date + 180, admin_id, 'active'),
    (ws, 'Holiday Planning', 'Seasonal planning and year-end customer stories.', '#f59e0b', current_date + 20, current_date + 90, editor_id, 'active')
  on conflict do nothing;

  select id into campaign_launch from public.campaigns where workspace_id = ws and name = 'Q4 Product Launch';
  select id into campaign_evergreen from public.campaigns where workspace_id = ws and name = 'Evergreen Community';
  select id into campaign_holiday from public.campaigns where workspace_id = ws and name = 'Holiday Planning';

  insert into public.tags (workspace_id, name, color)
  values
    (ws, 'Launch', '#2563eb'), (ws, 'Education', '#10b981'),
    (ws, 'Customer Story', '#8b5cf6'), (ws, 'Urgent', '#ef4444'),
    (ws, 'Seasonal', '#f59e0b'), (ws, 'Repurpose', '#64748b')
  on conflict (workspace_id, name) do nothing;

  -- The workflow trigger intentionally protects normal application writes.
  -- Seed data is trusted fixture data, so temporarily bypass only that trigger.
  alter table public.content_items disable trigger enforce_content_workflow;

  for i in 1..50 loop
    campaign_id := case when i % 3 = 0 then campaign_launch when i % 3 = 1 then campaign_evergreen else campaign_holiday end;
    assigned_id := case when i % 4 = 0 then manager_id when i % 4 = 1 then editor_id when i % 4 = 2 then admin_id else viewer_id end;
    content_type_value := case i % 6 when 0 then 'video'::public.content_type when 1 then 'carousel'::public.content_type when 2 then 'reel'::public.content_type when 3 then 'story'::public.content_type when 4 then 'document'::public.content_type else 'image'::public.content_type end;
    priority_value := case when i % 13 = 0 then 'urgent'::public.priority when i % 5 = 0 then 'high'::public.priority when i % 2 = 0 then 'medium'::public.priority else 'low'::public.priority end;
    content_status := case when i <= 8 then 'posted'::public.master_status when i <= 16 then 'scheduled'::public.master_status when i <= 25 then 'approved'::public.master_status when i <= 34 then 'in_review'::public.master_status when i <= 42 then 'changes_requested'::public.master_status else 'draft'::public.master_status end;
    item_title := case i
      when 1 then 'Meet the new ContentFlow workspace'
      when 2 then 'Five ways to shorten approval cycles'
      when 3 then 'Customer story: Northstar Studio'
      when 4 then 'Behind the scenes: launch day'
      when 5 then 'Content calendar checklist'
      else format('%s content idea %s', case when i % 3 = 0 then 'Community' when i % 3 = 1 then 'Launch' else 'Holiday' end, lpad(i::text, 2, '0')) end;
    item_slug := regexp_replace(lower(item_title), '[^a-z0-9]+', '-', 'g') || '-' || i;
    item_brief := format('Create a %s asset for %s. Include one clear takeaway, a practical example, and a direct next step for the audience.', content_type_value, case when i % 3 = 0 then 'community engagement' when i % 3 = 1 then 'product adoption' else 'seasonal planning' end);

    insert into public.content_items (
      workspace_id, campaign_id, title, slug, content_type, master_status, priority,
      brief, created_by, assigned_to, approved_by, approved_at, due_at, scheduled_at, posted_at
    ) values (
      ws, campaign_id, item_title, item_slug, content_type_value, content_status, priority_value,
      item_brief, editor_id, assigned_id,
      case when content_status in ('approved','scheduled','posted') then manager_id end,
      case when content_status in ('approved','scheduled','posted') then now() - (i || ' days')::interval end,
      now() + ((i - 18) || ' days')::interval,
      case when content_status in ('scheduled','posted') then now() + ((i - 10) || ' days')::interval end,
      case when content_status = 'posted' then now() - ((18 - i) || ' days')::interval end
    ) returning id into item_id;

    for platform in select unnest(array['facebook','instagram','tiktok']::public.platform_name[]) loop
      platform_status_value := case
        when content_status = 'posted' then 'posted'::public.platform_status
        when content_status = 'scheduled' then 'scheduled'::public.platform_status
        when content_status in ('approved','in_review') then 'draft'::public.platform_status
        else 'not_planned'::public.platform_status
      end;
      platform_caption := format('%s — a practical idea from the ContentFlow team. Save this for later and share it with someone building a better content workflow. #ContentFlow #ContentOps', item_title);
      insert into public.content_platforms (
        workspace_id, content_item_id, platform_name, platform_status, caption, hashtags,
        scheduled_at, posted_at, posted_by, checklist_completed, notes
      ) values (
        ws, item_id, platform, platform_status_value, platform_caption, '#ContentFlow #ContentOps #Marketing',
        case when platform_status_value = 'scheduled' then now() + ((i - 10) || ' days')::interval end,
        case when platform_status_value = 'posted' then now() - ((18 - i) || ' days')::interval end,
        case when platform_status_value = 'posted' then editor_id end,
        platform_status_value in ('scheduled','posted'),
        case when platform_status_value = 'not_planned' then 'Select this platform when the creative is ready.' end
      ) returning id into platform_id;

      if platform_status_value = 'scheduled' then
        insert into public.publishing_jobs (workspace_id, content_platform_id, status, run_at)
        values (ws, platform_id, 'queued', now() + ((i - 10) || ' days')::interval)
        on conflict do nothing;
      end if;
    end loop;

    select id into tag_id from public.tags where workspace_id = ws and name = case when i % 3 = 0 then 'Community' when i % 3 = 1 then 'Launch' else 'Seasonal' end;
    if tag_id is null then
      select id into tag_id from public.tags where workspace_id = ws and name = case when i % 3 = 1 then 'Launch' when i % 3 = 2 then 'Seasonal' else 'Education' end;
    end if;
    insert into public.content_item_tags (content_item_id, tag_id) values (item_id, tag_id) on conflict do nothing;

    if i % 4 = 0 then
      insert into public.comments (workspace_id, content_item_id, user_id, body)
      values (ws, item_id, manager_id, 'Please make the opening hook more specific and add one measurable example.');
    end if;
    if content_status = 'in_review' then
      insert into public.approval_requests (workspace_id, content_item_id, requested_by)
      values (ws, item_id, editor_id) on conflict do nothing;
    elsif content_status in ('approved','scheduled','posted') then
      insert into public.approval_requests (workspace_id, content_item_id, requested_by, reviewed_by, decision, decision_note, decided_at)
      values (ws, item_id, editor_id, manager_id, 'approved', 'Approved for publishing.', now() - (i || ' hours')::interval)
      on conflict do nothing;
    end if;
  end loop;

  alter table public.content_items enable trigger enforce_content_workflow;

  insert into public.notifications (workspace_id, user_id, type, title, body, is_read, entity_type)
  values
    (ws, manager_id, 'approval_requested', 'Approval queue needs attention', 'Four content items are waiting for your review.', false, 'content'),
    (ws, editor_id, 'assignment', 'New work assigned', 'You have new launch content assigned to you.', false, 'content'),
    (ws, admin_id, 'publishing_failed', 'Publishing worker setup required', 'Some scheduled posts still need a provider publishing worker.', false, 'publishing'),
    (ws, viewer_id, 'mention', 'You were mentioned in a review', 'A reviewer asked for your input on a content brief.', true, 'content')
  on conflict do nothing;

  insert into public.social_connections (
    workspace_id, provider, account_type, external_account_id, name, username,
    status, metadata, last_synced_at, created_by
  ) values
    (ws, 'facebook', 'page', 'demo-facebook-page', 'ContentFlow Demo Page', 'contentflowdemo', 'active', '{"demo":true,"publishing_ready":false}', now() - interval '2 hours', admin_id),
    (ws, 'instagram', 'profile', 'demo-instagram-profile', 'ContentFlow Demo Instagram', 'contentflow.demo', 'active', '{"demo":true,"publishing_ready":false}', now() - interval '26 hours', admin_id),
    (ws, 'tiktok', 'profile', 'demo-tiktok-profile', 'ContentFlow Demo TikTok', 'contentflowdemo', 'paused', '{"demo":true,"publishing_ready":false}', now() - interval '4 days', admin_id)
  on conflict (workspace_id, provider, external_account_id) do nothing;

  insert into public.automation_rules (
    workspace_id, name, description, enabled, priority, trigger_type, conditions, actions, created_by
  ) values
    (ws, 'Reply to positive comments', 'Suggest a helpful reply when a comment mentions a successful workflow.', true, 10, 'incoming_comment', '[{"type":"contains","field":"text","value":"helpful"}]', '[{"type":"reply_comment","message":"Thanks for sharing this with the community!"}]', manager_id),
    (ws, 'Notify team about launch posts', 'Notify the team after a launch post is published.', true, 20, 'content_posted', '[]', '[{"type":"notify_team","message":"A launch post is live."}]', admin_id),
    (ws, 'Manual customer-story follow-up', 'A safe dry-run example for the demo workspace.', false, 30, 'manual', '[]', '[{"type":"notify_team","message":"Follow up with the customer story owner."}]', editor_id)
  on conflict do nothing;
end $$;
