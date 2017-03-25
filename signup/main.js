wassimdbu:wassim@ds137110.mlab.com:37110/syrphonedb
mongodb://localhost:27017/webrtc-db

doSomething()
    .then(doNextStage)
    .then(recordTheWorkSoFar)
    .then(updateAnyInterestedParties)
    .then(tidyUp)
    .catch(errorHandler)


    function makeIterator(array) {
    var nextIndex = 0;

    return {
       next: function() {
           return nextIndex < array.length ?
               {value: array[nextIndex++], done: false} :
               {done: true};
       }
    };
}
