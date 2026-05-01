pipeline {
     agent any

    environment {
        APP_NAME   = "inventory-app"
        GIT_REPO   = "https://github.com/Salma-Hossam1/inventory-app-project"
        GIT_BRANCH = "master"
        SONAR_HOST_URL = "http://sonarqube:9000"
        SONAR_SERVER = "SonarQube1"
    }

  tools {
    nodejs "nodejs"
    sonarQubeScanner "sonar-scanner"
}

    stages {

        stage('Checkout') {
            steps {
                git branch: "${GIT_BRANCH}", url: "${GIT_REPO}"
            }
        }

        stage('Check Node') {
    steps {
        sh 'node -v'
        sh 'npm -v'
    }
}

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Run Tests + Coverage') {
            steps {
                sh 'npm run test:cov'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv("${SONAR_SERVER}") {
                     sh 'sonar-scanner'
                }
            }
        }

        // stage('Quality Gate') {
        //     steps {
        //         timeout(time: 5, unit: 'MINUTES') {
        //             waitForQualityGate abortPipeline: true
        //         }
        //     }
        // }
    }

    post {
        success {
            echo "✅ Pipeline succeeded"
        }
        failure {
            echo "❌ Pipeline failed"
        }
    }
}