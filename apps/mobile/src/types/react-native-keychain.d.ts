declare module 'react-native-keychain' {
  export const ACCESSIBLE: Record<string, string>;
  export function getInternetCredentials(server: string): Promise<{ username: string; password: string } | false>;
  export function setInternetCredentials(
    server: string,
    username: string,
    password: string,
    options?: { accessible?: string }
  ): Promise<void>;
}
