/**
 * Clay Reimann, 2015
 * See LICENSE.txt for details
 */
import SuggestionService from '../../lib/search-service';

const MORE_RESULTS = ' <dim>Append ">" to see the next page.</dim>';
const FEATURE_REQUEST = 'feature-request';
const REFRESH = 'refresh';
const COMMANDS = [
  {
    content: `!${FEATURE_REQUEST}`,
    description: '!<match>feature-request</match> - Request a new feature for this extension'
  },
  {
    content: `!${REFRESH}`,
    description: '<dim>!</dim><match>refresh</match> - Refresh the list of repositories from github'
  }
];

let CACHE = {};
let SUGGESTER = null;

function initializeExtension() {
  chrome.storage.sync.get(['githubs'], initalizeSuggestionService);
}

function parseOptions(text) {
  let page = 0;
  let isMeta = false;
  let command = '';
  let chars = text.split('');

  while (chars[chars.length - 1] === '>') {
    page++;
    chars.pop()
  }

  isMeta = chars[0] === '!';
  if (isMeta) {
    command = chars.slice(1).join('');
  }

  text = chars.join('');


  return {
    isMeta,
    command,
    page,
    text: chars.join('')
  }
}

function getRepoSuggestions(text) {
  let suggestions = [];

  if (CACHE.hasOwnProperty(text)) {
    suggestions = CACHE[text]
  } else {
    suggestions = SUGGESTER.getRepositoriesMatching(text)
      .map(function(repo) {
        let matches = repo.url.match(new RegExp(text, "i"));
        return {
          content: repo.name,
          description: '<dim>Open</dim> <url>' + repo.url.slice(0, matches.index) +
            '<match>' + matches[0] + '</match>' +
            repo.url.slice(matches.index + matches[0].length) + '</url>'
        };
      });
    CACHE[text] = suggestions;
  }
  console.log('returning ' + suggestions.length + ' suggestions');
  console.log(suggestions.map((s) => s.content.length));
  console.log(suggestions.map((s) => s.content));

  return suggestions;
}

function getSuggestions(text, suggest) {
  if (SUGGESTER == null) { return; }
  if (text.length < 1) { return; }

  let page, isMeta, command;
  ({
    page,
    isMeta,
    command,
    text,
  } = parseOptions(text));

  let suggestions, description;
  if (isMeta) {
    suggestions = COMMANDS.slice();
    description = 'Execute a command';
  } else {
    suggestions = getRepoSuggestions(text)
    if (suggestions.length > 5) {
      description += ` Page ${page + 1} of ${Math.ceil(suggestions.length / 5)}. ${MORE_RESULTS}`
    }

    for (let i = 0; i < page && suggestions.length > 5; i++) {
      suggestions = suggestions.slice(5);
    }

    description = `${suggestions.length} results for query <match>%s</match>.`;
  }

  if (suggestions.length && suggestions[0].content === text) {
    description = `${suggestions[0].description}  |  ${description}`
  }
  chrome.omnibox.setDefaultSuggestion({description});
  suggest(suggestions);
}

function suggestionAccepted(suggestion, disposition) {
  if (SUGGESTER == null) { return; }

  console.log(`Accepted: ${suggestion} ${disposition}`);
  let {
    isMeta,
    command,
    text
  } = parseOptions(suggestion);
  let url;
  if (isMeta) {
    switch (command) {
      case REFRESH:
        initializeExtension();
        return;
      case FEATURE_REQUEST:
        url = 'https://github.com/clayreimann/github-search-extension/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement';
        break;
    }
  } else {
    url = SUGGESTER.getUrlForRepo(suggestion)
  }

  if (disposition === 'currentTab') {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
      chrome.tabs.update(tabs[0].id, {url: url});
    });
  } else if (disposition === 'newForegroundTab') {
    chrome.tabs.create({url: url, active: true});
  } else if (disposition === 'newBackgroundTab') {
    chrome.tabs.create({url: url});
  }
}

function initalizeSuggestionService(settings) {
  let githubInstances = settings.githubs || [];
  if (githubInstances.length < 1) {
    return;
  }
  CACHE = {};
  SUGGESTER = new SuggestionService(githubInstances);
  SUGGESTER.queryGithubsForRepositories();
}

initializeExtension();
chrome.omnibox.onInputStarted.addListener(function() {
  console.log('inputStarted');
  chrome.omnibox.setDefaultSuggestion({description: 'Type to search for a repository'});
});

chrome.omnibox.onInputChanged.addListener(getSuggestions);
chrome.omnibox.onInputEntered.addListener(suggestionAccepted);

chrome.runtime.onMessage.addListener(function(message) {
  if (message === 'settings-updated') {
    initializeExtension();
  }
});
