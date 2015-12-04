var FORM = document.getElementById('settings-form');
FORM.addEventListener("submit", processForm);
var SAVE_BUTTON = document.getElementById('save-button')

function processForm(e) {
  e.preventDefault();
  var token = document.getElementById('oauth-token-1').value;
  var url = document.getElementById('github-url-1').value;
  chrome.storage.sync.set({
    githubs: [
      {
        url: url,
        token: token
      }
    ]
  });
  chrome.runtime.sendMessage('settings-updated');
}

var FORM_GROUP_CLASS_NAME = 'form-group';
var LABEL_CLASS_NAME = 'col-sm-2 control-label';
var INPUT_DIV_CLASS_NAME = 'col-sm-6'
var INPUT_CLASS_NAME = 'form-control'
function createInputGroup(id, title, placeholder, value) {
  var inputLabel = document.createElement('label');
  inputLabel.innerText = title;
  inputLabel.setAttribute('for', id)
  inputLabel.className = LABEL_CLASS_NAME;
  var input = document.createElement('input');
  input.className = INPUT_CLASS_NAME;
  input.setAttribute('id', id);
  input.setAttribute('placeholder', placeholder);
  input.value = value;

  var inputDiv = document.createElement('div');
  inputDiv.className = INPUT_DIV_CLASS_NAME;
  inputDiv.appendChild(input);

  var inputGroup = document.createElement('div')
  inputGroup.className = FORM_GROUP_CLASS_NAME;
  inputGroup.appendChild(inputLabel);
  inputGroup.appendChild(inputDiv);

  return inputGroup
}

function addInstance(token, url) {
  var num = FORM.children.length;
  var fieldset = document.createElement('fieldset');
  var legend = document.createElement('legend');
  legend.innerText = 'Instance ' + num;

  var tokenGroup = createInputGroup('oauth-token-' + num, 'OAuth Token', 'token', token);
  var urlGroup = createInputGroup('github-url-' + num, 'Github URL', 'https://api.github.com', url);

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
