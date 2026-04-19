(function () {
  var filterRoot = document.querySelector('[data-tag-filter]');
  var postList = document.getElementById('post-list');
  if (!filterRoot || !postList) return;

  var chips = filterRoot.querySelectorAll('[data-tag]');
  var clearBtn = document.querySelector('[data-tag-clear]');
  var emptyMsg = postList.querySelector('.tag-filter-empty');
  var yearGroups = postList.querySelectorAll('.year-group');
  var posts = postList.querySelectorAll('.post-item');
  var selected = new Set();

  function applyFilter() {
    var anyVisible = false;
    posts.forEach(function (post) {
      var tags = (post.getAttribute('data-tags') || '').split('|').filter(Boolean);
      var show = selected.size === 0 || tags.some(function (t) { return selected.has(t); });
      post.hidden = !show;
      if (show) anyVisible = true;
    });

    yearGroups.forEach(function (group) {
      var hasVisible = group.querySelector('.post-item:not([hidden])');
      group.hidden = !hasVisible;
    });

    if (emptyMsg) emptyMsg.hidden = anyVisible || selected.size === 0;
    if (clearBtn) clearBtn.hidden = selected.size === 0;
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function (e) {
      e.preventDefault();
      var tag = chip.getAttribute('data-tag');
      if (selected.has(tag)) {
        selected.delete(tag);
        chip.classList.remove('is-active');
        chip.setAttribute('aria-pressed', 'false');
      } else {
        selected.add(tag);
        chip.classList.add('is-active');
        chip.setAttribute('aria-pressed', 'true');
      }
      applyFilter();
    });
    chip.setAttribute('role', 'button');
    chip.setAttribute('aria-pressed', 'false');
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      selected.clear();
      chips.forEach(function (chip) {
        chip.classList.remove('is-active');
        chip.setAttribute('aria-pressed', 'false');
      });
      applyFilter();
    });
  }
})();
