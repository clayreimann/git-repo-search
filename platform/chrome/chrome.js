/**
 * Clay Reimann, 2015
 * See LICENSE.txt for details
 */
import CommandParser from '../../lib/command-parser';
import SuggestionService from '../../lib/search-service';

const MORE_RESULTS = ' <dim>Append ">" to see the next page.</dim>';
const FEATURE_REQUEST = 'feature-request';
const REFRESH = 'refresh';
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
const REPO_COMMANDS = [
  {
    content: '!pulls',
    description: '<dim>!pulls</dim> - View pull requests'
  },
  {
    content: '!issues',
    description: '<dim>!issues</dim> - View open issues'
  }
];

const COMMAND = new CommandParser('chrome');

let HAS_SETTINGS = false;
let CACHE = {};
let SUGGESTER = null;

function initializeExtension() {
  chrome.storage.sync.get(['githubs'], initalizeSuggestionService);
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

  return suggestions;
}

function getSuggestions(input, suggest) {
  if (SUGGESTER == null) { return; }
  if (input.length < 1) { return; }

  let {
    isMeta,
    isRepo,
    text,
    page,
    command,
  } = COMMAND.parse(input);

  let suggestions, description;
  if (isMeta) {
    suggestions = META_COMMANDS.slice();
    description = 'Execute a command';
  } else if (isRepo) {
    description = 'Repository quick links';
    if (!CACHE.hasOwnProperty(text)) {
      getRepoSuggestions(text);
    }
    let repo = CACHE[text][0];
    suggestions = REPO_COMMANDS.map((command) => {
      return {
        content: repo.content + command.content,
        description: repo.description + command.description
      };
    });
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

  suggestions.some((s) => {
    if (s.content === input) {
      description = `${s.description}  |  ${description}`;
      return true;
    }
  })
  console.log('returning ' + suggestions.length + ' suggestions');
  console.log(suggestions);

  chrome.omnibox.setDefaultSuggestion({description});
  suggest(suggestions);
}

function suggestionAccepted(input, disposition) {
  if (HAS_SETTINGS === false) { chrome.runtime.openOptionsPage(); }
  if (SUGGESTER == null) { return; }

  console.log(`Accepted: ${input} ${disposition}`);
  let url;
  let {
    isMeta,
    isRepo,
    command,
    text
  } = COMMAND.parse(input);

  if (isMeta) {
    switch (command) {
      case REFRESH:
        initializeExtension();
        return;
      case FEATURE_REQUEST:
        url = 'https://github.com/clayreimann/github-search-extension/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement';
        break;
    }
  } else if (isRepo) {
    url = SUGGESTER.getUrlForRepo(text, command);
  } else {
    url = SUGGESTER.getUrlForRepo(input)
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
    HAS_SETTINGS = false;
    return;
  }
  HAS_SETTINGS = true;
  CACHE = {};
  SUGGESTER = new SuggestionService(githubInstances);
  SUGGESTER.queryGithubsForRepositories();
}

initializeExtension();
chrome.omnibox.onInputStarted.addListener(function() {
  console.log('inputStarted');
  let description = 'You need to add at least one GitHub definition. &lt;Enter&gt; to open settings.';
  if (HAS_SETTINGS) {
    description = 'Type to search for a repository';
  }
  chrome.omnibox.setDefaultSuggestion({description});
});

chrome.omnibox.onInputChanged.addListener(getSuggestions);
chrome.omnibox.onInputEntered.addListener(suggestionAccepted);

chrome.runtime.onMessage.addListener(function(message) {
  if (message === 'settings-updated') {
    initializeExtension();
  }
});
