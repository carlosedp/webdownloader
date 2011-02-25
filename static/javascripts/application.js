(function() {
      $('#logout').click(function(e) {
    e.preventDefault();
    if (confirm('Are you sure you want to sign out?')) {
      var element = $(this),
          form = $('<form></form>');
      form
        .attr({
          method: 'POST',
          action: '/session'
        })
        .hide()
        .append('<input type="hidden" />')
        .find('input')
        .attr({
          'name': '_method',
          'value': 'delete'
        })
        .end()
        .submit();
    }
  });
$('.remove_download').click(function(e) {
    e.preventDefault();
    if (confirm('Are you sure you want to remove this download?')) {
      var element = $(this),
          form = $('<form></form>');
      form
        .attr({
          method: 'POST',
          action: '/downloads/'+element.attr('dl_id')
        })
        .hide()
        .append('<input type="hidden" />')
        .find('input')
        .attr({
          'name': '_method',
          'value': 'delete'
        })
        .end()
        .submit();
    }
  });


})();
