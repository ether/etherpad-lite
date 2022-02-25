'use strict';

let $sidedivinner;
let init;

exports.postAceInit = (hookName, context) => {
  $sidedivinner = $('iframe[name="ace_outer"]').contents().find('#sidedivinner');
  if (!$('#editorcontainerbox').hasClass('flex-layout')) {
    return $.gritter.add({
      title: 'Error',
      text: 'ep_author_colors: Please upgrade to Mudoc 0.0.2 for this plugin to work correctly',
      sticky: true,
      class_name: 'error',
    });
  }
};

const derivePrimaryAuthor = ($node) => {
  let mPA, authorClass;
  const byAuthor = new Map();
  $node.find('span').each(function () {
    const $this = $(this);
    for (const spanclass of this.classList) {
      if (spanclass.startsWith('author')) {
        byAuthor.set(spanclass, (byAuthor.get(spanclass) || 0) + $this.text().length);
      }
    }
  });
  mPA = 0;
  authorClass = null;
  for (const [author, value] of byAuthor) {
    if (value <= mPA) continue;
    mPA = value;
    authorClass = author;
  }
  return authorClass;
};

const toggleAuthor = ($node, prefix, authorClass) => {
  if ($node.length === 0) return true;
  let hasClass = false;
  const myClass = `${prefix}-${authorClass}`;
  for (const c of $node[0].classList) {
    if (c.indexOf(prefix) !== 0) continue;
    if (c === myClass) {
      hasClass = true;
    } else {
      $node.removeClass(c);
    }
  }
  if (hasClass) {
    return false;
  }
  $node.addClass(myClass);
  return true;
};

const updateDomline = ($node) => {
  const lineNumber = $node.index() + 1;
  if (!lineNumber) {
    return false;
  }
  const authorClass = $node.text().length > 0 ? derivePrimaryAuthor($node) : 'none';
  toggleAuthor($node, 'primary', authorClass);
  return authorViewUpdate($node, lineNumber, null, authorClass);
};

const extractAuthor = ($node) => {
  let ref$, ref1$;
  return (ref$ = (() => {
    const results$ = [];
    for (const a of $node[0].classList) {
      if (a.startsWith('primary-')) results$.push(a);
    }
    return results$;
  })()) != null ? (ref1$ = ref$[0]) != null ? ref1$.replace(/^primary-/, '') : void 8 : void 8;
};

const authorViewUpdate = ($node, lineNumber, prevAuthor, authorClass) => {
  let prev, ref$, authorChanged, logicalPrevAuthor;
  if (!$sidedivinner) {
    $sidedivinner = $('iframe[name="ace_outer"]').contents().find('#sidedivinner');
  }
  const $authorContainer = $sidedivinner.find(`div:nth-child(${lineNumber})`);
  if (authorClass == null) authorClass = extractAuthor($node);
  if (!prevAuthor) {
    prev = $authorContainer;
    while ((prev = prev.prev()) && prev.length) {
      prevAuthor = extractAuthor(prev);
      if (prevAuthor !== 'none') {
        break;
      }
    }
  }
  $authorContainer.toggleClass('concise', prevAuthor === authorClass);
  const prevId = (ref$ = $authorContainer.attr('id')) != null ? ref$.replace(/^ref-/, '') : void 8;
  if (prevId === $node.attr('id')) {
    authorChanged = toggleAuthor($authorContainer, 'primary', authorClass);
    if (!authorChanged) {
      return;
    }
  } else {
    $authorContainer.attr('id', `ref-${$node.attr('id')}`);
    toggleAuthor($authorContainer, 'primary', authorClass);
  }
  const next = $node.next();
  if (next.length) {
    logicalPrevAuthor = authorClass === 'none' ? prevAuthor : authorClass;
    return authorViewUpdate(next, lineNumber + 1, logicalPrevAuthor);
  }
};

const getAuthorClassName = (author) => `author-${author.replace(/[^a-y0-9]/g, (c) => {
  if (c === '.') {
    return '-';
  } else {
    return `z${c.charCodeAt(0)}z`;
  }
})}`;

const outerInit = (outerDynamicCSS) => {
  const x$ = outerDynamicCSS.selectorStyle('#sidedivinner.authorColors > div');
  x$.borderRight = 'solid 5px transparent';
  const y$ = outerDynamicCSS.selectorStyle('#sidedivinner.authorColors > div.concise::before');
  y$.content = "' '";
  const z$ = outerDynamicCSS.selectorStyle('#sidedivinner.authorColors > div::before');
  z$.fontSize = '11px';
  z$.textTransform = 'capitalize';
  z$.textOverflow = 'ellipsis';
  z$.overflow = 'hidden';
  return init = true;
};

exports.aceSetAuthorStyle = (hookName, context) => {
  const {author, dynamicCSS, info, outerDynamicCSS, parentDynamicCSS} = context;
  if (!init) {
    outerInit(outerDynamicCSS);
  }
  const authorClass = getAuthorClassName(author);
  const authorSelector = `.authorColors span.${authorClass}`;
  if (info) {
    const color = info.bgcolor;
    if (!color) {
      return 1;
    }
    const authorName = authorNameAndColorFromAuthorId(author).name;
    const x$ = dynamicCSS.selectorStyle(`#innerdocbody.authorColors span.${authorClass}`);
    x$.borderBottom = `2px solid ${color}`;
    x$.paddingBottom = '1px';
    const y$ = parentDynamicCSS.selectorStyle(authorSelector);
    y$.borderBottom = `2px solid ${color}`;
    y$.paddingBottom = '1px';
    const z$ = dynamicCSS.selectorStyle(
        `#innerdocbody.authorColors .primary-${authorClass} span.${authorClass}`);
    z$.borderBottom = '0px';
    const z1$ = outerDynamicCSS.selectorStyle(
        `#sidedivinner.authorColors > div.primary-${authorClass}`);
    z1$.borderRight = `solid 5px ${color}`;
    const z2$ = outerDynamicCSS.selectorStyle(
        `#sidedivinner.authorColors > div.primary-${authorClass}::before`);
    z2$.content = `'${authorName}'`;
    z2$.paddingLeft = '5px';
    z2$.whiteSpace = 'nowrap';
    const z3$ = outerDynamicCSS.selectorStyle(
        `.line-numbers-hidden #sidedivinner.authorColors > div.primary-${authorClass}::before`);
    z3$.paddingRight = '12px';
  } else {
    dynamicCSS.removeSelectorStyle(`#innerdocbody.authorColors span.${authorClass}`);
    parentDynamicCSS.removeSelectorStyle(authorSelector);
  }
  return 1;
};

const authorNameAndColorFromAuthorId = (authorId) => {
  let authorObj;
  const myAuthorId = pad.myUserInfo.userId;
  if (myAuthorId === authorId) {
    return {
      name: 'Me',
      color: pad.myUserInfo.colorId,
    };
  }
  authorObj = {};
  $('#otheruserstable > tbody > tr').each(function () {
    let x$;
    if (authorId === $(this).data('authorid')) {
      x$ = $(this);
      x$.find('.usertdname').each(function () {
        return authorObj.name = $(this).text() || 'Unknown Author';
      });
      x$.find('.usertdswatch > div').each(function () {
        return authorObj.color = $(this).css('background-color');
      });
      return authorObj;
    }
  });
  if (!authorObj || !authorObj.name) {
    authorObj = clientVars.collab_client_vars.historicalAuthorData[authorId];
  }
  return authorObj || {
    name: 'Unknown Author',
    color: '#fff',
  };
};

exports.acePostWriteDomLineHTML =
    (hookName, {node}) => setTimeout(() => updateDomline($(node)), 200);

exports.aceEditEvent = (hookName, {callstack}) => {
  if (callstack.type !== 'setWraps') {
    return;
  }
  const x$ = $('iframe[name="ace_outer"]').contents();
  x$.find('#sidediv').css({
    'padding-right': '0px',
  });
  x$.find('#sidedivinner').css({
    'max-width': '180px',
    'overflow': 'hidden',
  });
  return x$;
};
