'use client';

import type { BotSection } from '@/components/sidebar/BotView';
import BotApplicationsPage from '@/components/bots/pages/BotApplicationsPage';
import BotShopPage from '@/components/bots/pages/BotShopPage';
import BotStatisticsPage from '@/components/bots/pages/BotStatisticsPage';

interface BotPageProps {
  section: BotSection;
  onSectionChange?: (section: BotSection) => void;
  onOpenBotChat?: (chatId: string, data: { name: string; avatar?: string }) => void;
}

export default function BotPage({ section, onSectionChange, onOpenBotChat }: BotPageProps) {
  const openApplications = () => onSectionChange?.('applications');

  return (
    <div className="h-full overflow-y-auto bg-white">
      {section === 'accueil' && <BotShopPage onCreateBot={openApplications} onOpenBotChat={onOpenBotChat} />}
      {section === 'applications' && <BotApplicationsPage />}
      {section === 'statistiques' && <BotStatisticsPage onCreateBot={openApplications} />}
    </div>
  );
}
