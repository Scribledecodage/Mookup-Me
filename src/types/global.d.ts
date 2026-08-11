// Extension du type Window pour la gestion du bouton retour mobile
interface Window {
  /** Positionné à true par un gestionnaire interne quand il intercepte l'event app_back */
  _appBackHandled?: boolean;
}
