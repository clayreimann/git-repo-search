/**
 * Clay Reimann, 2017
 * See LICENSE.txt for details
 */

import Github from 'github-api';

function collectRepos(source) {
  return source.map((repo) => ({
    name: repo.full_name,
    url: repo.html_url,
    homepage: repo.homepage
  }));
}

function matchSubstrings(delim, text) {

}

export default class Multiplexer {
  constructor(instances) {
    this._githubs = {};
    this._repos = [];

    instances.forEach((descriptor) => {
      this._githubs[descriptor.url] = new Github(descriptor, descriptor.url);
    });

    this.fetch();
    setTimeout(() => {
      console.log('refreshing repo cache');
      this.fetch();
    }, 60000);
  }

  fetch() {
    let allRepos = {}
    this._loading = Promise.all(Object.keys(this._githubs)
      .map((url) => {
        console.log(`loading ${url}`);
        let gh = this._githubs[url];
        let user = gh.getUser();

        return Promise.all([
          user.listRepos(),
          user.listOrgs().then(({data: orgs}) => Promise.all(
            orgs.map((org) => gh.getOrganization(org.login).getRepos()) // map orgs to repos
          )).then(([...orgRepos]) => orgRepos.reduce((list, {data: repos}) => list.concat(repos), [])) // collect the list of repos into a single list

        ]).then(([{data: userRepos}, [...orgRepos]]) => {
            allRepos[url] = [].concat(collectRepos(userRepos)).concat(collectRepos(orgRepos));
            return allRepos[url];
          });
      })).then((repos) => {
        let urls = {};
        let repositories = repos.reduce((target, list) => {
          list.forEach((repo) => {
              if (urls[repo.url]) return;
              urls[repo.url] = true;
              target.push(repo);
            });
          return target;
        }, []);
        this._repos = repositories;
        console.log('loaded');
      }).catch(function(err) {
        console.log('Could not connect to all github instances');
        console.log(err);
        console.log(allRepos);
      });
  }

  repositoriesMatching(text) {
    let reText = text;
    if (reText.indexOf('/') !== -1) {
      reText = reText.split('/').map((s) => `(${s})`).join(`.*/.*`);
    }
    reText = `${reText}.*`.replace(/(\.\*)+/, '.*');
    let re = new RegExp(reText, 'i');
    return this._repos.filter((repo) => repo.name.search(re) != -1)
      .map((repo) => {
        repo.matches = re.exec(repo.name);
        return repo;
      });
  }

  getUrlForRepo(text, type = 'repo') {
    let repo = this._repos.filter((repo) => repo.name === text).shift();
    if (!repo) {
      repo = this.repositoriesMatching(text)[0];
    }
    switch (type) {
      case 'issues':
        return `${repo.url}/issues`;

      case 'pulls':
        return `${repo.url}/pulls`;

      case 'homepage':
        return repo.homepage || repo.url;

      default:
        return repo.url
    }
  }
}
