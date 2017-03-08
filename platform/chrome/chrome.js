/**
 * Clay Reimann, 2015
 * See LICENSE.txt for details
 */
import CommandParser, {FEATURE_REQUEST, REFRESH} from '../../lib/command-parser';
import Multiplexer from '../../lib/repo-multiplexer';

let REPO_FINDER;
let SETTINGS_LOADED = false;
let RESULTS = null;
const COMMAND = new CommandParser('chrome');
const MORE_RESULTS = ' <dim>Append ">" to see the next page.</dim>';

chrome.omnibox.onInputStarted.addListener(function() { console.log('inputStarted'); });
chrome.omnibox.onInputChanged.addListener(getSuggestions);
chrome.omnibox.onInputEntered.addListener(suggestionAccepted);
chrome.runtime.onMessage.addListener(messageHandler);

// load settings from chrome
initializeExtension();

/**
 * Return suggestions to the user
 * @param {string} input the user's input
 * @param {function} suggestCallback the callback fn([{String:content, String:description}]:suggestions)
 * @return {[type]} [description]
 */
function getSuggestions(input, suggestCallback) {
  console.log(`input: ${input}`);
  if (!SETTINGS_LOADED) {
    chrome.omnibox.setDefaultSuggestion({
      description: 'You need to add at least one GitHub definition. &lt;Enter&gt; to open settings.'
    });
  }

  let suggestions, description;
  let { isMetaCmd, isRepoCmd, page, command, text } = COMMAND.parse(input);
  if (isMetaCmd) {
    description = 'Enter a command';
    suggestions = COMMAND.getMetaCommands();
  } else if (isRepoCmd) {
    description = 'Repository shortcut'
    suggestions = COMMAND.getShortcutsFor(RESULTS[0])
  } else {
    let begin = new Date().getTime()
    let allSuggestions = REPO_FINDER.repositoriesMatching(text);
    RESULTS = allSuggestions.sort(sortFn).slice(page * 5, (page + 1) * 5);
    suggestions = RESULTS.map(buildSuggestion)
      .map((s) => ({content: s.content, description: s.description}));

    description = suggestions.length == 0 ?
      'Type to search for a repository' :
      `Found ${allSuggestions.length} matches in ${new Date().getTime() - begin}ms ${allSuggestions.length > 4 ? MORE_RESULTS : ''}`;
    console.log(suggestions);
  }

  chrome.omnibox.setDefaultSuggestion({description});
  suggestCallback(suggestions);
}

/**
 * Sort two suggestions by org name then by repo name
 * @param {object} a a repo suggestion
 * @param {object} b a repo suggestion
 * @return {int} -1 if a < b, 0 if a == b, 1 if a > b
 */
function sortFn(a, b) {
  let left = a.name.toLowerCase().split('/'), right = b.name.toLowerCase().split('/');
  if (left[0] < right[0]) return -1;
  else if (left[0] > right[0]) return 1;
  else if (left[1] < right[1]) return -1
  else if (left[1] > right[1]) return 1
  else return 0;
}

/**
 * Construct the suggestion object that Chrome is expecting
 *
 * @param {object} repo the repo descriptor
 * @return {object} a suggestion object
 */
function buildSuggestion(repo) {
  let url = repo.url;
  let start = 0;
  for(let i = 1; i < repo.matches.length; i++) {
    let match = repo.matches[i];
    console.log(repo.matches);
    start = url.indexOf(match, start);
    url = url.slice(0, start) + `<match>${match}</match>` + url.slice(start + match.length);
    start = start + '<match>'.length + match.length + '</match>'.length;
  }
  return {
    content: repo.name,
    description: `<dim>${repo.name} - </dim><url>${url}</url> ${repo.homepage ? `(${repo.homepage})` : ''}`
  }
}

/**
 * Handler for when a user accepts a suggestion
 *
 * @param {string} input the text the user accepted
 * @param {string} disposition how the user wants to open the suggestion
 */
function suggestionAccepted(input, disposition) {
  if (!SETTINGS_LOADED) { chrome.runtime.openOptionsPage(); }
  if (!REPO_FINDER) { return; }
  if (!input) { return; }

  console.info(`Accepted: ${input} ${disposition}`);
  let url;
  let {isMetaCmd, isRepoCmd, command, text} = COMMAND.parse(input);

  if (isMetaCmd) {
    switch (command) {
      case REFRESH:
        initializeExtension();
        return;
      case FEATURE_REQUEST:
        url = 'https://github.com/clayreimann/github-search-extension/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement';
        break;
    }
  } else if (isRepoCmd) {
    url = REPO_FINDER.getUrlForRepo(text, command);
  } else {
    // need to handle short circuited input for 1 result
    url = REPO_FINDER.getUrlForRepo(text) ||
          REPO_FINDER.getUrlForRepo(LAST_SUGGESTION);
  }

  // adjustSuggestionWeight(LAST_INPUT, text);

  if (disposition === 'currentTab') {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
      chrome.tabs.update(tabs[0].id, {url: url});
    });
  } else if (disposition === 'newForegroundTab') {
    chrome.tabs.create({url: url, active: true});
  } else if (disposition === 'newBackgroundTab') {
    chrome.tabs.create({url: url});
  }

  RESULTS = null;
}


function messageHandler(message) {
  switch (message) {
    case 'settings-updated':
      initializeExtension();
      break;
  }
}

function initializeExtension() {
  chrome.storage.sync.get({
    'githubs': [],
    'weights': {}
  }, initalizeSearchService);
}

function initalizeSearchService(settings) {
  let githubInstances = settings.githubs;
  if (githubInstances.length < 1) {
    SETTINGS_LOADED = false;
    return;
  }

  githubInstances = githubInstances.filter((gh) => gh.token)
    .map((gh) => {
      gh.url = gh.url || 'https://api.github.com/v3';
      return gh;
    });
  chrome.storage.sync.set({
    'githubs': githubInstances
  });

  window.REPO_FINDER = REPO_FINDER = new Multiplexer(githubInstances);
  SETTINGS_LOADED = true;
}
