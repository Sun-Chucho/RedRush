// Native (iOS) app entry. Android uses app/index.android.tsx and web uses
// app/index.web.tsx — all three are intentionally distinct. The two native
// platforms share one welcome screen so they can never drift apart.
import AppWelcome from '@/components/AppWelcome';

export default AppWelcome;
