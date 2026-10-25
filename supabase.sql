-- دیتابیس کلاس ۲۲۷ (Supabase). جدول‌ها و تابع‌های ثبت/ویرایش از قبل ساخته شده‌اند.
-- فقط اگر دکمهٔ حذف (🗑️) در پنل کار نکرد، این دو تابع را یک بار در SQL Editor اجرا (Run) کنید:

create or replace function public.admin_delete_item(p text, item_id text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.check_pw(p) then raise exception 'unauthorized' using errcode = '28000'; end if;
  delete from public.items where id = item_id;
end $$;

create or replace function public.admin_delete_grade(p text, gid text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.check_pw(p) then raise exception 'unauthorized' using errcode = '28000'; end if;
  delete from public.grades where id = gid;
end $$;

-- حذف لغت (برای دکمهٔ 🗑️ در تب لغت‌ها):
create or replace function public.admin_delete_word(p text, wid text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.check_pw(p) then raise exception 'unauthorized' using errcode = '28000'; end if;
  delete from public.vocab where id = wid;
end $$;
