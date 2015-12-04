/**
 * A service that suggests repositories based on user input
 * @param  {Array[Object]} ghInstances - an array of objects with `url` and `token` properties
 */
var SuggestionService = function(ghInstances) {
  this.GITHUBS = ghInstances.map(function(instance) {
    return new Github({
      apiUrl: instance.url,
      token: instance.token,
      auth: 'oauth'
    });
  })
  this.REPOS = [];
  this.OUTSTANDING_API_REQUESTS = 0;
  this.getRepos();
}

SuggestionService.prototype.makeRequest = function() {
  this.OUTSTANDING_API_REQUESTS += 1;
};
SuggestionService.prototype.finishRequest = function() {
  this.OUTSTANDING_API_REQUESTS -= 1;
};
SuggestionService.prototype.isReady = function() {
  return this.OUTSTANDING_API_REQUESTS === 0;
};

SuggestionService.prototype.addRepository = function(github, repo) {
  var contains = false;
  this.REPOS.forEach(function(r) {
    if (r.github === github && r.name === repo.full_name) {
      contains = true;
    }
  });
  if (!contains) {
    this.REPOS.push({
      github: github,
      name: repo.full_name,
      url: repo.html_url
    });
  }
};

SuggestionService.prototype.getRepos = function() {
  var _this = this;
  this.REPOS = [];
  this.GITHUBS.forEach(function(github) {
    var user = github.getUser();

    _this.makeRequest();
    user.repos(function(err, repos) {
      console.log(repos.map(function(repo) {
        return repo.full_name;
      }));
      _this.finishRequest();

      if (!repos) { return; }
      repos.forEach(function(repo) {
        repo.user = user;
        _this.addRepository(github, repo);
      });
    });

    _this.makeRequest();
    user.orgs(function(err, orgs) {
      _this.finishRequest();

      if (!orgs) { return; }
      orgs.forEach(function(org) {

        _this.makeRequest();
        user.orgRepos(org.login, function(err, repos) {
          _this.finishRequest();

          console.log(repos.map(function(repo) {
            return repo.full_name;
          }));
          if (!repos) { return; }
          repos.forEach(function(repo) {
            _this.addRepository(github, repo);
          });
        });
      });
    });
  });
};

SuggestionService.prototype.getRepositoriesMatching = function(text) {
  return this.REPOS.filter(function(repo) {
    return repo.name.search(new RegExp(text, 'i')) !== -1;
  });
}

SuggestionService.prototype.getUrlForRepo = function(fullName) {
  var repo = this.REPOS.filter(function(r) {
    return r.name === fullName;
  })[0];
  return repo ? repo.url : undefined;
};
