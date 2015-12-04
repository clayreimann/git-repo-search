// Clay Reimann, 2015
// See repository LICENSE for details

console.log('Initializing extension');
function initalizeSuggestionService() {
  chrome.storage.sync.get(['githubs'],
    function(settings) {
      console.log(settings);
      var githubsDefs = settings.githubs;
      if (githubsDefs.length < 1) {
        return;
      }
      var suggester = new SuggestionService(githubsDefs);

      chrome.omnibox.onInputStarted.addListener(
        function() {
          console.log('inputStarted');
          chrome.omnibox.setDefaultSuggestion({
            description: 'Type to search for a repository'
          });
        }
      );

      chrome.omnibox.onInputChanged.addListener(
        function(text, suggest) {
          if (text.length < 1) { return; }
          var suggestions = suggester.getRepositoriesMatching(text)
            .map(function(repo) {
              var matches = repo.url.match(new RegExp(text, "i"));
              return {
                content: repo.name,
                description: '<dim>Open</dim> <url>' + repo.url.slice(0, matches.index) +
                  '<match>' + matches[0] + '</match>' +
                  repo.url.slice(matches.index + matches[0].length) + '</url>'
              };
            });
          console.log('returning ' + suggestions.length + ' suggestions');
          console.log(suggestions);

          chrome.omnibox.setDefaultSuggestion({
            description: suggestions.length + ' results for "%s"' + (suggestions.length > 5 ? '. Enter a more specific query.' : '')
          });
          suggest(suggestions);
        }
      );

      chrome.omnibox.onInputEntered.addListener(
        function(repoName, disposition) {
          console.log(repoName + ' ' + disposition);
          var url = suggester.getUrlForRepo(repoName)
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
      );
    }
  );
}

initalizeSuggestionService();
chrome.runtime.onMessage.addListener(function(message) {
  if (message === 'settings-updated') {
    initalizeSuggestionService();
  }
})
