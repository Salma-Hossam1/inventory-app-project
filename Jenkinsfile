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
                trivy image --no-progress --exit-code 0 --severity HIGH,CRITICAL $REGISTRY/$IMAGE_NAME:$IMAGE_TAG
                """
            } 
        }  
        stage('Push Image to docker hub') {
    steps {
        withCredentials([usernamePassword(
            credentialsId: 'docker-hub-credentials',
            usernameVariable: 'DOCKER_USER',
            passwordVariable: 'DOCKER_PASS'
        )]) {
            sh """
            echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
            docker push $DOCKER_USER/${IMAGE_NAME}:${IMAGE_TAG}
            """
        }
    }
}
       stage('Update GitOps Repo') {
    steps {
        withCredentials([usernamePassword(
            credentialsId: 'github-creds',
            usernameVariable: 'GIT_USER',
            passwordVariable: 'GIT_PASS'
        )]) {

            sh """
            rm -rf inventory-gitops

            git clone https://$GIT_USER:$GIT_PASS@github.com/Salma-Hossam1/inventory-gitops.git

            cd inventory-gitops/prod

            # update ONLY main containers (not initContainers)
            yq -i '
              (.spec.template.spec.containers[] 
              | select(.name == "inventory-app") 
              | .image) = "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
            ' deployment.yaml

            yq -i '
              (.spec.template.spec.containers[] 
              | select(.name == "inventory-app") 
              | .image) = "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
            ' worker.yaml

            yq -i '
              (.spec.template.spec.containers[] 
              | select(.name == "inventory-app") 
              | .image) = "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
            ' cron.yaml

            cd ..

            git config user.name "jenkins"
            git config user.email "jenkins@ci.com"

            git add .
            git commit -m "Update image to $IMAGE_TAG"
            git push
            """
        }
    }
}
    }

    post {
        success {
            echo "✅ Pipeline succeeded"
            cleanWs()
        }
        failure {
            echo "❌ Pipeline failed"
            cleanWs()
        }
    }
}
