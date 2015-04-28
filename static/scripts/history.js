function showTab() {
    var hash = window.location.hash;

    if(hash) {
        $('ul.nav-tabs a[href="' + hash + '"]').tab('show');
    } else {
        $('ul.nav-tabs li:first a').tab('show');
    }
}

$(function(){
  showTab();

  $('.nav-tabs a').click(function (e) {
    $(this).tab('show');
    window.location.hash = this.hash;
  });
  
  $('.panel-collapse:first').addClass('in');
  
  window.onpopstate = function(evt) {
      showTab();
  }
});