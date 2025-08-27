-- Initialize database user and extensions
create user ai_companion_app with password 'ai_companion_dev';
grant connect on database ai_companion to ai_companion_app;