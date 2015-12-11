const FORM = document.getElementById('settings-form');
const SAVE_BUTTON = document.getElementById('save-button')
FORM.addEventListener("submit", processForm);
document.getElementById('add-source').addEventListener('click',  addNewInstance);

function addNewInstance() {
  addInstance('', '');
}

function processForm(e) {
  e.preventDefault();

  let definitions = [];
  for (let i = 1; i < FORM.children.length; i++) {
    let token = document.getElementById(`oauth-token-${i}`).value;
    let url = document.getElementById(`github-url-${i}`).value;
    definitions.push({
      url: url,
      token: token,
      auth: 'oauth'
    });
  }

  chrome.storage.sync.set({
    githubs: definitions
  });
  chrome.runtime.sendMessage('settings-updated');
}

const FORM_GROUP_CLASS_NAME = 'form-group';
const LABEL_CLASS_NAME = 'col-sm-2 control-label';
const INPUT_DIV_CLASS_NAME = 'col-sm-6'
const INPUT_CLASS_NAME = 'form-control'
function createInputGroup(id, title, placeholder, value) {
  let inputLabel = document.createElement('label');
  inputLabel.innerText = title;
  inputLabel.setAttribute('for', id)
  inputLabel.className = LABEL_CLASS_NAME;
  let input = document.createElement('input');
  input.className = INPUT_CLASS_NAME;
  input.setAttribute('id', id);
  input.setAttribute('placeholder', placeholder);
  input.value = value;

  let inputDiv = document.createElement('div');
  inputDiv.className = INPUT_DIV_CLASS_NAME;
  inputDiv.appendChild(input);

  let inputGroup = document.createElement('div')
  inputGroup.className = FORM_GROUP_CLASS_NAME;
  inputGroup.appendChild(inputLabel);
  inputGroup.appendChild(inputDiv);

  return inputGroup
}

function addInstance(token, url) {
  let num = FORM.children.length;
  let fieldset = document.createElement('fieldset');
  let legend = document.createElement('legend');
  legend.innerText = 'Instance ' + num;

  let tokenGroup = createInputGroup(`oauth-token-${num}`, 'OAuth Token', 'token', token);
  let urlGroup = createInputGroup(`github-url-${num}`, 'Github URL', 'https://api.github.com', url);

  fieldset.appendChild(legend);
  fieldset.appendChild(tokenGroup);
  fieldset.appendChild(urlGroup);
  FORM.insertBefore(fieldset, SAVE_BUTTON);
}

chrome.storage.sync.get(['githubs'], function(settings) {
  var githubs = settings.githubs;

  if (!githubs) {
    addInstance('', '');
  } else {
    githubs.forEach(function(def) {
      addInstance(def.token, def.url);
    });
  }
});
