//copied from http://stackoverflow.com/questions/8407946/is-it-possible-to-use-iframes-in-ie-without-memory-leaks
(function($) {
    $.fn.purgeFrame = function() {
        var deferred;

        if ($.browser.msie && parseFloat($.browser.version, 10) < 9) {
            deferred = purge(this);
        } else {
            this.remove();
            deferred = $.Deferred();
            deferred.resolve();
        }

        return deferred;
    };

    function purge($frame) {
        var sem = $frame.length
          , deferred = $.Deferred();

        $frame.load(function() {
            var frame = this;
            frame.contentWindow.document.innerHTML = '';

            sem -= 1;
            if (sem <= 0) {
                $frame.remove();
                deferred.resolve();
            }
        });
        $frame.attr('src', 'about:blank');

        if ($frame.length === 0) {
            deferred.resolve();
        }

        return deferred.promise();
    }
})(jQuery);