/**
 * Clay Reimann, 2015
 * See LICENSE.txt for details
 */
import SuggestionService from '../../lib/search-service';

const MORE_RESULTS = ' <dim>Append ">" to see the next page.</dim>'
let CACHE = {};

function initalizeSuggestionService() {
  chrome.storage.sync.get(['githubs'], bindCallbacks);
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

  text = chars.join('');


  return {
    isMeta,
    page,
    text: chars.join('')
  }
}

function getSuggestFunction(suggester) {
  return function(text, suggest) {
    let page;
    if (text.length < 1) { return; }
    ({page, text} = parseOptions(text));

    let suggestions;
    if (CACHE.hasOwnProperty(text)) {
      suggestions = CACHE[text]
    } else {
      suggestions = suggester.getRepositoriesMatching(text)
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


    let description = `${suggestions.length} results for query <match>%s</match>.`
    if (suggestions.length > 5) {
      description += ` Page ${page + 1} of ${Math.ceil(suggestions.length / 5)}. ${MORE_RESULTS}`
    }

    for (let i = 0; i < page && suggestions.length > 5; i++) {
      suggestions = suggestions.slice(5);
    }
    if (suggestions.length && suggestions[0].content === text) {
      description = `${suggestions[0].description}  |  ${description}`
    }
    chrome.omnibox.setDefaultSuggestion({description});
    suggest(suggestions);
  };
}

function getCompletionFunction(suggester) {
  return function(repoName, disposition) {
    console.log(repoName + ' ' + disposition);
    let url = suggester.getUrlForRepo(repoName)
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
}

function bindCallbacks(settings) {
  let githubInstances = settings.githubs || [];
  if (githubInstances.length < 1) {
    return;
  }
  let suggester = new SuggestionService(githubInstances);
  CACHE = {};
  suggester.queryGithubsForRepositories();

  chrome.omnibox.onInputChanged.addListener(getSuggestFunction(suggester));
  chrome.omnibox.onInputEntered.addListener(getCompletionFunction(suggester));
}

initalizeSuggestionService();
chrome.omnibox.onInputStarted.addListener(function() {
  console.log('inputStarted');
  chrome.omnibox.setDefaultSuggestion({description: 'Type to search for a repository'});
});

chrome.runtime.onMessage.addListener(function(message) {
  if (message === 'settings-updated') {
    initalizeSuggestionService();
  }
});
