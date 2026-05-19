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
        // Slack Configuration
        SLACK_CHANNEL  = "#jenkins-ci"
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
        
        // Wait for SonarQube background processing to complete
        timeout(time: 5, unit: 'MINUTES') {
            script {
                def qg = waitForQualityGate()
                env.SONAR_STATUS = qg.status
                
                // --- Extract Detailed Metrics via SonarQube API ---
                
                // 1. Read the project key and server URL from the local scanner report
                def props = readProperties file: '.scannerwork/report-task.txt'
                def projectKey = props['projectKey']
                def sonarUrl = props['serverUrl']
                
                // 2. Query SonarQube API for specific metric values
                // We request: coverage, bugs, vulnerabilities, code_smells, and reliability_rating
                def metricKeys = "coverage,bugs,vulnerabilities,code_smells,reliability_rating"
                def response = sh(
                    script: "curl -s '${sonarUrl}/api/measures/component?component=${projectKey}&metricKeys=${metricKeys}'", 
                    returnStdout: true
                ).trim()
                
                // 3. Parse the JSON response to extract the actual metrics
                // This uses native Groovy JsonSlurper (No external tools required)
                def json = new groovy.json.JsonSlurper().parseText(response)
                def measures = json.component.measures
                
                // 4. Assign metrics to environment variables to use in your Slack stage
                env.SONAR_COVERAGE = measures.find { it.metric == 'coverage' }?.value ?: "0%"
                env.SONAR_BUGS     = measures.find { it.metric == 'bugs' }?.value ?: "0"
                env.SONAR_VULNS    = measures.find { it.metric == 'vulnerabilities' }?.value ?: "0"
                env.SONAR_SMELLS   = measures.find { it.metric == 'code_smells' }?.value ?: "0"
                
                // Clean up percentage formatting if needed
                if (!env.SONAR_COVERAGE.endsWith('%')) {
                    env.SONAR_COVERAGE = "${env.SONAR_COVERAGE}%"
                }
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
                // sh """
                // trivy image --no-progress --exit-code 0 --severity HIGH,CRITICAL $REGISTRY/$IMAGE_NAME:$IMAGE_TAG
                // """
                script {
                    // Run scan and output results to a JSON file for parsing, ignoring exit code so pipeline continues
                    sh "trivy image --format json --output trivy-report.json --severity HIGH,CRITICAL $REGISTRY/$IMAGE_NAME:$IMAGE_TAG || true"
                    
                    // Parse counts using grep/jq/awk depending on what's available in your container. 
                    // This is a robust fallback script to grab vulnerability sums:
                    env.CRITICAL_COUNT = sh(script: "grep -o '\"Severity\":\"CRITICAL\"' trivy-report.json | wc -l", returnStdout: true).trim()
                    env.HIGH_COUNT     = sh(script: "grep -o '\"Severity\":\"HIGH\"' trivy-report.json | wc -l", returnStdout: true).trim()
                }
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
        // SLACK NOTIFICATION 1: Artifact Summary Card
                slackSend(
                    channel: "${SLACK_CHANNEL}", 
                    color: env.SONAR_STATUS == 'OK' ? 'good' : 'danger', 
    message: """📦 *Artifact Created & Metrics Summary*
• *Image:* `${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}`
• *Quality Gate:* `${env.SONAR_STATUS ?: 'UNKNOWN'}`
📊 *SonarQube Code Quality Metrics:*
• *Code Coverage:* `${env.SONAR_COVERAGE}`
• *Bugs Found:* 🐜 `${env.SONAR_BUGS}`
• *Vulnerabilities:* 🔓 `${env.SONAR_VULNS}`
• *Code Smells:* 🦨 `${env.SONAR_SMELLS}`

🛡️ *Trivy Container Security:*
• 🔴 *Critical:* `${env.CRITICAL_COUNT}` | 🟠 *High:* `${env.HIGH_COUNT}`"""
)
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
            # 1. Clean up and Download yq
            rm -rf inventory-gitops

            # install yq locally
            curl -L https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -o yq
            chmod +x yq
            export YQ_PATH=\$(pwd)/yq

            # 2. Clone using credentials safely
            git clone https://${GIT_USER}:${GIT_PASS}@github.com/Salma-Hossam1/inventory-gitops.git
            cd inventory-gitops/prod/app

            # 3. Update YAMLs using absolute path for yq ## update ONLY main containers (not initContainers)
            \$YQ_PATH -i '(.spec.template.spec.containers[] | select(.name == "inventory-app") | .image) = "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"' deployment.yaml
            \$YQ_PATH -i '(.spec.template.spec.containers[] | select(.name == "inventory-worker") | .image) = "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"' worker.yaml
            \$YQ_PATH -i '(.spec.template.spec.containers[] | select(.name == "stock-report") | .image) = "$REGISTRY/$IMAGE_NAME:$IMAGE_TAG"' cron.yaml

            # 4. Commit and Push only if changes exist
            git config user.name "jenkins"
            git config user.email "jenkins@ci.com"
            
            if [ -n "\$(git status --porcelain)" ]; then
                git add .
                git commit -m "Update image to $IMAGE_TAG"
                git push origin main
            else
                echo "No changes detected in YAML files. Skipping push."
            fi
            """
        }
    }
}
stage('Verify K8s ArgoCD Deployment') {
            steps {
                script {
                    echo "Waiting 30 seconds for ArgoCD to detect Git push..."
                    sleep 30 
                    
                    // Pull live operational data right out of the ArgoCD engine
                    env.ARGO_SYNC   = sh(script: "argocd app get inventory-app --fields format=json | jq -r '.status.sync.status'", returnStdout: true).trim()
                    env.ARGO_HEALTH = sh(script: "argocd app get inventory-app --fields format=json | jq -r '.status.health.status'", returnStdout: true).trim()
                    env.K8S_NS      = sh(script: "argocd app get inventory-app --fields format=json | jq -r '.spec.destination.namespace'", returnStdout: true).trim()
                }
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline succeeded"
            // SLACK NOTIFICATION 2: Deployment Live Status Card
            slackSend(
                channel: "${SLACK_CHANNEL}", 
                color: 'good', 
                message: """🚀 *Deployment Successfully Verified!*
• *App Name:* `${APP_NAME}`
• *ArgoCD Sync State:* `${env.ARGO_SYNC}`
• *K8s Cluster Health:* ❤️ `${env.ARGO_HEALTH}`
• *Target Namespace:* `${env.K8S_NS}`
• *Build URL:* ${env.BUILD_URL}"""
            )
            cleanWs()
        }
        failure {
            echo "❌ Pipeline failed"
            slackSend(
                channel: "${SLACK_CHANNEL}", 
                color: 'danger', 
                message: "❌ *Pipeline Broken:* ${env.JOB_NAME} [${env.BUILD_NUMBER}] failed during execution. \nReview Details here: ${env.BUILD_URL}"
            )
            cleanWs()
        }
    }
}
