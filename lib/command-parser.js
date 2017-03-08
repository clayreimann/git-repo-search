/**
 * Clay Reimann, 2015
 * See LICENSE.txt for details
 */
export const FEATURE_REQUEST = 'feature-request';
export const REFRESH = 'refresh';

class CommandParser {
  constructor(platform) {
    this.platform = platform.toLowerCase();
  }

  parse(text) {
    switch (this.platform) {
      case 'chrome':
        return this._parseChrome(text);
      default:
    }
  }

  _parseChrome(text) {
    let page = 0;
    let isMetaCmd = false;
    let isRepoCmd = false;
    let command = '';
    let chars = text.split('');

    while (chars[chars.length - 1] === '>') {
      page++;
      chars.pop()
    }

    let metaCharPos = chars.lastIndexOf('!');
    if (metaCharPos === 0) {
      isMetaCmd = true;
      command = chars.slice(1).join('');
    } else if (metaCharPos > 0) {
      isRepoCmd = true;
      command = chars.slice(1 + metaCharPos).join('');
      chars = chars.slice(0, metaCharPos)
    }

    text = chars.join('');


    return {
      isMetaCmd,
      isRepoCmd,
      page,
      command,
      text: chars.join('')
    }
  }

  getMetaCommands(command) {
    switch (this.platform) {
      case 'chrome':
        return this._chromeMetaCommands(command);
      default:
        throw new Error('Platform not implemented');
    }
  }

  _chromeMetaCommands(command) {
    const META_COMMANDS = [
      {
        content: `!${FEATURE_REQUEST}`,
        description: '!<match>feature-request</match> - Request a new feature for this extension'
      },
      {
        content: `!${REFRESH}`,
        description: '<dim>!</dim><match>refresh</match> - Refresh the list of repositories from github'
      }
    ];
    return META_COMMANDS.slice();
  }

  getShortcutsFor(repo) {
    switch (this.platform) {
      case 'chrome':
        return this._chromeShortcutsFor(repo);
      default:
        throw new Error('Platform not implemented');
    }
  }

  _chromeShortcutsFor(repo) {
    let commands = [{
      content: `${repo.name}!pulls`,
      description: 'Open the pull request for this project'
    }, {
      content: `${repo.name}!issues`,
      description: 'Open the issues for this project'
    }];

    if (repo.homepage) {
      commands.unshift({content: `${repo.name}!homepage`, description: `Open <url>${repo.homepage}</url>`});
    }

    return commands;
  }
}

export default CommandParser;
