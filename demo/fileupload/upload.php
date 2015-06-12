<?php
$json = array(
    'status'=>0,
    'data'=>$_FILES
);

header('content-type', 'application/json');

echo json_encode($json);
