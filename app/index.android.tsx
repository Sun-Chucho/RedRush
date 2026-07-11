// Native (Android) app entry. Shares the same welcome screen as iOS
// (app/index.tsx) via the AppWelcome component so the two native platforms
// stay identical. Web has its own landing page in app/index.web.tsx.
import AppWelcome from '@/components/AppWelcome';

export default AppWelcome;
