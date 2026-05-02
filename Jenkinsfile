pipeline {
     agent any

    environment {
        APP_NAME   = "inventory-app"
        GIT_REPO   = "https://github.com/Salma-Hossam1/inventory-app-project"
        GIT_BRANCH = "master"
        SONAR_HOST_URL = "http://sonarqube:9000"
        SONAR_SERVER = "SonarQube1"

        IMAGE_NAME = "inventory-app"
        IMAGE_TAG = "${env.GIT_COMMIT}"
        REGISTRY = "salmahossam12"
    }

  tools {
    nodejs "nodejs"
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
                     script {
                def scannerHome = tool 'sonar-scanner'
                sh "${scannerHome}/bin/sonar-scanner"
            }
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
        stage('Build Image') {
            steps {
                sh """
                docker build -t $REGISTRY/$IMAGE_NAME:$IMAGE_TAG .
                """
            }
        }
        stage('trivy scan') {
            steps {
                sh """
                trivy image --exit-code 0 --severity HIGH,CRITICAL $REGISTRY/$IMAGE_NAME:$IMAGE_TAG
                """
            } 
        }  
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