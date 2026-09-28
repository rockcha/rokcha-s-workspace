import { LinksManager } from '@/features/links/links-manager'
export function LinksPage({ token }: { token: string }) { return <LinksManager key={token} token={token} /> }