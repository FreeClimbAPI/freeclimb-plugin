<?php

declare(strict_types=1);

use Dotenv\Dotenv;
use FreeClimbStarter\AppFactory;

require dirname(__DIR__) . "/vendor/autoload.php";

Dotenv::createImmutable(dirname(__DIR__))->safeLoad();

AppFactory::create()->run();
