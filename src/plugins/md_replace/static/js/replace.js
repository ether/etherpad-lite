'use strict';

exports.postAceInit = (hook, context) => {
  $('#selectAll').click(() => {
    context.ace.callWithAce(
      (ace) => {
        const document = ace.ace_getDocument();

        const numberOfLines = $(document).find('body').contents().length;
        ace.ace_performSelectionChange([0, 0], [numberOfLines - 1, 0], false);
      },
      'selectAll',
      true,
    );
  });

  var buttonHTML =
    '<li class="separator"></li><li class="acl-write" id="findAndReplace"><a class="grouped-middle" data-l10n-id="pad.toolbar.replace.title" title="Find And Replace (Ctrl+H)"><button class="buttonicon icon-shuffle"></button></a></li>';
  $(buttonHTML).insertAfter($('.buttonicon-outdent').parent().parent());

  $('#findAndReplace').click(() => {
    $('#editorcontainerbox').find('#replace').toggleClass('popup-show');
  });

  const form = $('#editorcontainerbox').find('#replace form');

  $(form)
    .find('#replace-submit')
    .click((e) => {
      e.preventDefault();

      const from = $('#editorcontainerbox').find('#id-find').val();
      const to = $('#editorcontainerbox').find('#id-replace').val();

      const HTMLLines = $('iframe[name="ace_outer"]')
        .contents()
        .find('iframe')
        .contents()
        .find('#innerdocbody')
        .children('div');
      $(HTMLLines).each(function () {
        // For each line
        findAndReplace(from, to, this);
      });
      $('#editorcontainerbox').find('#replace').toggleClass('popup-show');
    });

  $(form)
    .find('#replace-close')
    .click((e) => {
      e.preventDefault();

      $('#editorcontainerbox').find('#replace').toggleClass('popup-show');
    });
};

const findAndReplace = (searchText, replacement, searchNode) => {
  if (!searchText || typeof replacement === 'undefined') {
    // Throw error here if you want...
    return;
  }
  const regex = typeof searchText === 'string' ? new RegExp(searchText, 'gi') : searchText;
  const childNodes = (searchNode || document.body).childNodes;
  let cnLength = childNodes.length;
  const excludes = ['html', 'head', 'style', 'title', 'meta', 'script', 'object', 'iframe', 'link'];

  while (cnLength--) {
    const currentNode = childNodes[cnLength];
    if (currentNode.nodeType === 1) {
      if (excludes.indexOf(currentNode.nodeName.toLowerCase() === -1)) {
        findAndReplace(searchText, replacement, currentNode);
      }
    }
    if (currentNode.nodeType !== 3 || !regex.test(currentNode.data)) {
      continue;
    }
    const parent = currentNode.parentNode;
    const frag = (() => {
      const html = currentNode.data.replace(regex, replacement);
      const wrap = document.createElement('div');
      const frag = document.createDocumentFragment();
      wrap.innerHTML = html;
      while (wrap.firstChild) {
        frag.appendChild(wrap.firstChild);
      }
      return frag;
    })();
    parent.insertBefore(frag, currentNode);
    parent.removeChild(currentNode);
  }
};
