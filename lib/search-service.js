/**
 * Clay Reimann, 2015
 * See LICENSE.txt for details
 */

import Github from 'github-api';

class SuggestionService {
  /**
   * Constructs a new SuggestionService
   *
   * @param  {array} githubDescriptors - an array of objects that describe the github instances to be searched
   *                                   	 the objects should be of the format
   *                                   	 {
   *                                   	   url: the github url
   *                                   	   auth: {oauth, basic} to describe the service type
   *                                   	   token: required when auth == oauth
   *                                   	   username: required when auth == basic
   *                                   	   password: required when auth == basic
   *                                   	 }
   */
  constructor(githubDescriptors) {
    this.__githubs = {};
    githubDescriptors.forEach((descriptor) => {
      let opts = {
        apiUrl: descriptor.url,
        auth: descriptor.auth
      };
      if (descriptor.auth === 'oauth') {
        opts.token = descriptor.token;
      } else {
        opts.username = descriptor.username;
        opts.password = descriptor.password;
      }
      this.__githubs[descriptor.url] = new Github(opts);
    });

    this.__repos = [];
  }

  isLoaded() {
    return this.__repos.length > 0;
  }

  addRepository(githubUrl, repository) {
    let isAdded = this.__repos.reduce((found, r) => {
      return found || (r.githubUrl === githubUrl && r.name === repository.full_name);
    }, false);

    if (!isAdded) {
      this.__repos.push({
        githubUrl,
        name: repository.full_name,
        url: repository.html_url
      });
    }
  }

  addRepositories(githubUrl, list) {
    if (!list) {
      return;
    }

    list.forEach((repository) => {
      this.addRepository(githubUrl, repository);
    });
  }

  queryGithubsForRepositories() {
    this.__repos = [];
    Object.keys(this.__githubs).forEach((githubUrl) => {
      let github = this.__githubs[githubUrl];
      let user = github.getUser();

      user.repos((err, repoList) => {
        this.addRepositories(githubUrl, repoList);
      })

      user.orgs((err, orgs) => {
        if (!orgs) {
          return;
        }

        orgs.forEach((org) => {
          user.orgRepos(org.login, (err, repoList) => {
            console.log(`got repos for ${org.login}`);
            this.addRepositories(githubUrl, repoList);
          })
        })
      })
    })
  }

  getRepositoriesMatching(text) {
    return this.__repos.filter(function(repo) {
      return repo.name.search(new RegExp(text, 'i')) !== -1;
    }).sort(function(a, b) {
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    });
  }

  getUrlForRepo(repoFullName) {
    return this.__repos.reduce(function(found, repo) {
      return found || (repo.name === repoFullName ? repo.url : found);
    }, undefined);
  }

}

module.exports = SuggestionService;
