/**
 * Clay Reimann, 2015
 * See LICENSE.txt for details
 */

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
    let isMeta = false;
    let isRepo = false;
    let command = '';
    let chars = text.split('');

    while (chars[chars.length - 1] === '>') {
      page++;
      chars.pop()
    }

    let metaCharPos = chars.lastIndexOf('!');
    if (metaCharPos === 0) {
      isMeta = true;
      command = chars.slice(1).join('');
    } else if (metaCharPos > 0) {
      isRepo = true;
      command = chars.slice(1 + metaCharPos).join('');
      chars = chars.slice(0, metaCharPos)
    }

    text = chars.join('');


    return {
      isMeta,
      isRepo,
      page,
      command,
      text: chars.join('')
    }
  }
}


export default CommandParser;
