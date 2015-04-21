function showTab() {
    var hash = window.location.hash;
    console.log(hash);
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
    var scrollmem = $('body').scrollTop();
    window.location.hash = this.hash;
    $('html,body').scrollTop(scrollmem);
  });
  
  window.onpopstate = function(evt) {
      showTab();
  }
});