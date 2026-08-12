'use client';

import AccountInfoPage from './pages/AccountInfoPage';
import AccountSecurityPage from './pages/AccountSecurityPage';
import ActivityPrivacyPage from './pages/ActivityPrivacyPage';
import DesktopActivitySettingsPage from './pages/DesktopActivitySettingsPage';
import AccessibilityPage from './pages/AccessibilityPage';
import AppearancePage from './pages/AppearancePage';
import BioPassionsPage from './pages/BioPassionsPage';
import ConnectedAppsPage from './pages/ConnectedAppsPage';
import ConnectionsPage from './pages/ConnectionsPage';
import CookiesPage from './pages/CookiesPage';
import DataPrivacyPage from './pages/DataPrivacyPage';
import DeveloperPage from './pages/DeveloperPage';
import FamilyCenterPage from './pages/FamilyCenterPage';
import LanguageTimePage from './pages/LanguageTimePage';
import MessagingPermissionsPage from './pages/MessagingPermissionsPage';
import NotificationsPage from './pages/NotificationsPage';
import PrivacyPage from './pages/PrivacyPage';
import ProfileVisibilityPage from './pages/ProfileVisibilityPage';
import StatusPage from './pages/StatusPage';
import SystemPage from './pages/SystemPage';
import TermsPage from './pages/TermsPage';
import VoiceVideoPage from './pages/VoiceVideoPage';
import AdminPage from './pages/AdminPage';
import WindowsAppPage from './pages/WindowsAppPage';

const PROFILE_PAGES = {
  infos: AccountInfoPage,
  securite: AccountSecurityPage,
  statut: StatusPage,
  bio: BioPassionsPage,
  visibilite: ProfileVisibilityPage,
  public: ProfileVisibilityPage,
  familial: FamilyCenterPage,
  'donnees-confidentialite': DataPrivacyPage,
  'permissions-messagerie': MessagingPermissionsPage,
  'confidentialite-activites': ActivityPrivacyPage,
  'activite-desktop': DesktopActivitySettingsPage,
  notifications: NotificationsPage,
  apparence: AppearancePage,
  'voix-video': VoiceVideoPage,
  accessibilite: AccessibilityPage,
  systeme: SystemPage,
  'langue-heure': LanguageTimePage,
  connexions: ConnectionsPage,
  'applications-connectees': ConnectedAppsPage,
  'application-windows': WindowsAppPage,
  developpeur: DeveloperPage,
  'conditions-utilisation': TermsPage,
  confidentialite: PrivacyPage,
  cookies: CookiesPage,
  administration: AdminPage,
};

export default function ProfilePage({ section }) {
  const Page = PROFILE_PAGES[section] || AccountInfoPage;

  return (
    <div className="h-full overflow-y-auto bg-white relative">
      <div className="flex min-h-full w-full items-center justify-center">
        <Page />
      </div>
    </div>
  );
}
