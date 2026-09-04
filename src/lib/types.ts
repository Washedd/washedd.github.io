export const SITE = {
  name: 'Ethan Byrne',
  user: 'ethan',
  host: 'byrne',
  domain: 'ethanbyrne.co.uk',
  url: 'https://ethanbyrne.co.uk',
  github: 'https://github.com/Washedd',
  githubUser: 'Washedd',
  linkedin: 'https://www.linkedin.com/in/ethan-byrne-a1959a244/',
  role: 'Developer',
} as const;

export type ThemeName = 'dark' | 'crt';

export const THEME_NAMES = ['dark', 'crt'] as const;

export function isThemeName(value: string): value is ThemeName {
  return (THEME_NAMES as readonly string[]).includes(value);
}

export type TokenClass =
  | 'text'
  | 'kw'
  | 'fn'
  | 'str'
  | 'com'
  | 'num'
  | 'pn'
  | 'err'
  | 'ok'
  | 'dim';

export type OutputPart = {
  cls: TokenClass;
  text: string;
};

export type OutputLine = {
  parts: OutputPart[];
};

export type FsFile = {
  kind: 'file';
  content: string;
  href?: string;
};

export type FsDir = {
  kind: 'dir';
  children: Record<string, FsNode>;
};

export type FsNode = FsFile | FsDir;

export type SitePayload = {
  user: string;
  host: string;
  home: string;
  domain: string;
  name: string;
  role: string;
  github: string;
  linkedin: string;
  routes: {
    home: string;
    about: string;
    projects: string;
    contact: string;
  };
  fs: FsDir;
};

export type ActiveWindow = 'home' | 'about' | 'projects' | 'contact' | 'missing';

export type TermState = {
  cwd: string;
  theme: ThemeName;
};
