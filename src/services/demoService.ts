/**
 * @file Acceso al tenant demo público mostrado en la landing ("Probar demo
 * en vivo") -- ver `DemoAutoLoginView` en el backend.
 */
import { apiPublica } from './api';
import { tenantUrl } from '@/utils/tenantUrl';

interface DemoLoginResponse {
  access: string;
  refresh: string;
  tenant_domain: string;
}

/**
 * Pide un login sin contraseña para el tenant demo y arma la URL de
 * `/demo-entrar` con los tokens en el fragmento -- ver ese componente para
 * por qué no viajan como cookie puesta desde acá.
 */
export const construirUrlDemoEnVivo = async (): Promise<string> => {
  const response = await apiPublica.post<DemoLoginResponse>('/demo/login/', {});
  const { access, refresh } = response.data;
  return tenantUrl('demo', `/demo-entrar#access=${encodeURIComponent(access)}&refresh=${encodeURIComponent(refresh)}`);
};
