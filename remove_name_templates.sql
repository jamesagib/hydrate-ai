-- Remove name references from notification templates
-- Since we're now using AI-generated notifications, we don't need name placeholders

-- Update the ai_checkin template to remove {{name}}
UPDATE notification_templates 
SET body = 'Did you drink any water since I last checked in?' 
WHERE name = 'ai_checkin';

-- Alternative: Delete all notification templates since we're using AI now
-- DELETE FROM notification_templates;

-- Verify the update
SELECT name, title, body FROM notification_templates WHERE name = 'ai_checkin'; 