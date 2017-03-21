$(document).ready(function(){
    /* The following code is executed once the DOM is loaded */

    /* This flag will prevent multiple comment submits: */
    var working = false;
    $("#submit").click(function(){
      var inputtedPhoneNumber = $( "#firstname" ).val();

    // Match only numbers
    var phoneNumberRegex = /^\d*$/;

    // If the phone number doesn't match the regex
    if ( inputtedPhoneNumber ===""  ) {

        // Usually show some kind of error message here
        alert("champ vide");
        // Prevent the form from submitting
        event.preventDefault();
    } else {

      $.ajax({
           type: 'POST',
           url: 'http://localhost:8080/enroll',
           data: $('#addCommentForm').serialize(),
           success: function(response) {
              alert("Submitted comment");
               $("#commentList").append("Name:" + $("#firstname").val() );
           },
          error: function() {
               //$("#commentList").append($("#name").val() + "<br/>" + $("#body").val());
              alert("There was an error submitting comment");
          }
       });
    }

});
});
