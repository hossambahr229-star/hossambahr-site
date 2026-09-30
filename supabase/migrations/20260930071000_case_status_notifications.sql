create or replace function hb_private.notify_case_status_change()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_title text;
  v_body text;
  v_priority text := 'normal';
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  case new.status
    when 'waiting_customer' then
      v_title := 'مطلوب إجراء منك';
      v_body := 'الحالة تحتاج إجراءً أو موافقة منك للمتابعة.';
      v_priority := 'high';
    when 'waiting_external' then
      v_title := 'تم اعتماد الانتقال للجهة المختصة';
      v_body := 'الحالة بانتظار تنفيذ أو متابعة الإجراء لدى الجهة المختصة.';
    when 'blocked' then
      v_title := 'الحالة متوقفة';
      v_body := 'تحتاج الحالة معالجة سبب التوقف قبل الاستمرار.';
      v_priority := 'high';
    when 'completed' then
      v_title := 'اكتملت الحالة';
      v_body := 'تم استكمال خطوات الحالة المسجلة.';
    else
      return new;
  end case;

  insert into public.hb_notifications(
    user_id,category,title,body,entity_type,entity_id,priority,status,deliver_after
  )
  select
    new.user_id,'case_status',v_title,v_body,'case',new.id::text,v_priority,'unread',now()
  where not exists (
    select 1
    from public.hb_notifications n
    where n.user_id=new.user_id
      and n.category='case_status'
      and n.entity_type='case'
      and n.entity_id=new.id::text
      and n.title=v_title
      and n.status='unread'
  );

  return new;
end;
$$;

revoke all on function hb_private.notify_case_status_change() from public, anon, authenticated;

drop trigger if exists trg_hb_cases_status_notification on public.hb_cases;
create trigger trg_hb_cases_status_notification
after update of status on public.hb_cases
for each row execute function hb_private.notify_case_status_change();

insert into public.hb_notifications(
  user_id,category,title,body,entity_type,entity_id,priority,status,deliver_after
)
select
  c.user_id,
  'case_status',
  case c.status
    when 'waiting_customer' then 'مطلوب إجراء منك'
    when 'waiting_external' then 'تم اعتماد الانتقال للجهة المختصة'
    when 'blocked' then 'الحالة متوقفة'
  end,
  case c.status
    when 'waiting_customer' then 'الحالة تحتاج إجراءً أو موافقة منك للمتابعة.'
    when 'waiting_external' then 'الحالة بانتظار تنفيذ أو متابعة الإجراء لدى الجهة المختصة.'
    when 'blocked' then 'تحتاج الحالة معالجة سبب التوقف قبل الاستمرار.'
  end,
  'case',c.id::text,
  case when c.status in ('waiting_customer','blocked') then 'high' else 'normal' end,
  'unread',now()
from public.hb_cases c
where c.status in ('waiting_customer','waiting_external','blocked')
and not exists (
  select 1 from public.hb_notifications n
  where n.user_id=c.user_id
    and n.category='case_status'
    and n.entity_type='case'
    and n.entity_id=c.id::text
    and n.status='unread'
);
